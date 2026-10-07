import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from backend import main


class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.job = {"skills": ["React", "CSS", "Git"], "min_years": 3, "skill_weight": 80}

    def test_evidence_and_weighted_score(self):
        result = main.evaluate("React.js, CSS, Git\n3 năm kinh nghiệm phát triển web", self.job)
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["years"], 3)
        self.assertIn("React.js", result["skills"][0]["evidence"][0])

    def test_no_substring_matches_or_inferred_dates(self):
        result = main.evaluate("Reactive systems, GitHub\n2020 - 2026", self.job)
        self.assertEqual(result["matched_skills"], 0)
        self.assertIsNone(result["years"])
        self.assertEqual(result["score"], 0)
        self.assertTrue(result["warnings"])

    def test_partial_experience(self):
        result = main.evaluate("React CSS Git\n1.5 years of experience", self.job)
        self.assertEqual(result["score"], 90)

    def test_no_experience_required(self):
        result = main.evaluate("React", {**self.job, "min_years": 0})
        self.assertEqual(result["experience_score"], 100)

    def test_aliases_work_in_both_directions(self):
        result = main.evaluate("React Node.js PostgreSQL JavaScript\n3 years of experience", {
            **self.job, "skills": ["React.js", "NodeJS", "Postgres", "JS"],
        })
        self.assertEqual(result["matched_skills"], 4)
        self.assertEqual(result["score"], 100)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.old_path = main.DB_PATH
        main.DB_PATH = Path(self.folder.name) / "test.db"
        self.client_context = TestClient(main.app)
        self.client = self.client_context.__enter__()

    def tearDown(self):
        self.client_context.__exit__(None, None, None)
        main.DB_PATH = self.old_path
        self.folder.cleanup()

    def test_complete_persistent_workflow(self):
        job = self.client.post("/api/jobs", json={
            "title": "Python Developer", "department": "Engineering",
            "description": "Build reliable Python services and SQL databases.",
            "skills": ["Python", "SQL"], "min_years": 2, "skill_weight": 80,
        }).json()
        response = self.client.post(f"/api/jobs/{job['id']}/candidates", files={
            "file": ("Nguyen_An.txt", b"Python SQL developer\n2 years of experience\nan@example.com", "text/plain"),
        })
        self.assertEqual(response.status_code, 201)
        candidate = response.json()
        self.assertEqual(candidate["assessment"]["score"], 100)
        self.assertEqual(candidate["name"], "Nguyen An")
        updated = self.client.patch(f"/api/candidates/{candidate['id']}", json={
            "status": "shortlisted", "notes": "Interview requested",
        })
        self.assertEqual(updated.json()["notes"], "Interview requested")
        listed = self.client.get(f"/api/jobs/{job['id']}/candidates").json()
        self.assertEqual(listed[0]["status"], "shortlisted")
        self.assertEqual(self.client.delete(f"/api/candidates/{candidate['id']}").status_code, 204)
        self.assertEqual(self.client.get(f"/api/jobs/{job['id']}/candidates").json(), [])

    def test_invalid_uploads_and_missing_job(self):
        self.assertEqual(self.client.post("/api/jobs/999/candidates", files={
            "file": ("cv.txt", b"content"),
        }).status_code, 404)
        for filename, content, expected in [
            ("cv.exe", b"x" * 40, 415),
            ("cv.txt", b"tiny", 422),
            ("cv.pdf", b"not a pdf", 422),
            ("cv.txt", b"x" * (main.MAX_FILE_BYTES + 1), 413),
        ]:
            with self.subTest(filename=filename, expected=expected):
                response = self.client.post("/api/jobs/1/candidates", files={"file": (filename, content)})
                self.assertEqual(response.status_code, expected)

    def test_docx_and_pdf_text_extraction(self):
        import io
        from docx import Document
        from pypdf import PdfWriter
        document = Document()
        document.add_paragraph("Python SQL developer with 2 years of experience.")
        buffer = io.BytesIO()
        document.save(buffer)
        self.assertIn("Python", main.extract_text(buffer.getvalue(), "cv.docx"))
        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        buffer = io.BytesIO()
        writer.write(buffer)
        response = self.client.post("/api/jobs/1/candidates", files={"file": ("scan.pdf", buffer.getvalue())})
        self.assertEqual(response.status_code, 422)
        self.assertIn("OCR", response.json()["detail"])

    def test_text_pdf_is_assessed(self):
        import io
        from pypdf import PdfWriter
        from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
        writer = PdfWriter()
        page = writer.add_blank_page(width=600, height=800)
        font = DictionaryObject({
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        })
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)}),
        })
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 50 700 Td (React TypeScript JavaScript HTML CSS Git) Tj "
                        b"0 -20 Td (3 years of experience building web applications) Tj ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
        buffer = io.BytesIO()
        writer.write(buffer)
        response = self.client.post("/api/jobs/1/candidates", files={
            "file": ("candidate.pdf", buffer.getvalue()),
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["assessment"]["score"], 100)

    def test_invalid_job(self):
        response = self.client.post("/api/jobs", json={
            "title": "  ", "department": "HR", "description": "x" * 30,
            "skills": [" "], "min_years": -1,
        })
        self.assertEqual(response.status_code, 422)

    def test_wrong_field_types_return_validation_error(self):
        for value in [None, 42, ["Developer"]]:
            with self.subTest(value=value):
                response = self.client.post("/api/jobs", json={
                    "title": value, "department": "HR", "description": "x" * 30,
                    "skills": ["Python"], "min_years": 2,
                })
                self.assertEqual(response.status_code, 422)

    def test_corrupt_docx_xml_returns_parse_error(self):
        import io
        import zipfile
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("[Content_Types].xml", "<invalid")
        response = self.client.post("/api/jobs/1/candidates", files={
            "file": ("broken.docx", buffer.getvalue()),
        })
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
