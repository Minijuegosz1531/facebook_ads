import os

import pytest

os.environ["USE_STUBS"] = "true"


@pytest.fixture
def container():
    from config import Settings
    from infrastructure.container import Container

    return Container(Settings(USE_STUBS=True))
