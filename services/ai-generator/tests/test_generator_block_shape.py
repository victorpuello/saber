import pytest

from app.generator import _extract_valid_block_items


def test_extract_valid_block_items_rejects_single_item() -> None:
    with pytest.raises(ValueError, match="entre 2 y 3 items"):
        _extract_valid_block_items({"items": [{"stem": "Only one"}]})


def test_extract_valid_block_items_accepts_two_items() -> None:
    items = [{"stem": "One"}, {"stem": "Two"}]

    assert _extract_valid_block_items({"items": items}) == items