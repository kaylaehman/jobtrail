import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


JOBSPY_SERVICE_DIR = Path(__file__).parent
sys.path.insert(0, str(JOBSPY_SERVICE_DIR))

fake_jobspy = types.ModuleType("jobspy")
fake_jobspy.scrape_jobs = lambda **_kwargs: None
sys.modules.setdefault("jobspy", fake_jobspy)

import main  # noqa: E402


class SearchCompatibilityTests(unittest.TestCase):
    def setUp(self):
        main._cache.clear()

    def test_normalizes_ziprecruiter_and_omits_unset_optional_arguments(self):
        request = main.SearchRequest(
            site_name=["ziprecruiter"],
            search_term="radar engineer",
        )

        with patch.object(main, "scrape_jobs", return_value=None) as scrape_jobs:
            main.search(request)

        kwargs = scrape_jobs.call_args.kwargs
        self.assertEqual(kwargs["site_name"], ["zip_recruiter"])
        self.assertNotIn("location", kwargs)
        self.assertNotIn("hours_old", kwargs)
        self.assertNotIn("is_remote", kwargs)
        self.assertNotIn("job_type", kwargs)


if __name__ == "__main__":
    unittest.main()
