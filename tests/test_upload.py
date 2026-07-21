import io
import unittest

from app import app


class UploadEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_upload_csv_returns_preview(self):
        csv_data = b"col1,col2\n1,2\n3,4\n"
        response = self.client.post(
            "/upload",
            data={"file": (io.BytesIO(csv_data), "sample.csv")},
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["shape"], [2, 2])
        self.assertEqual(payload["columns"], ["col1", "col2"])
        self.assertEqual(len(payload["preview"]), 2)


if __name__ == "__main__":
    unittest.main()
