"""
Tests for favicon and touch icon static assets.

Covers: apple-touch-icon.png, favicon-32.png, favicon.ico
"""

import os
import struct
import unittest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PNG_MAGIC = b'\x89PNG\r\n\x1a\n'
ICO_MAGIC = b'\x00\x00\x01\x00'


def _read_file(filename):
    path = os.path.join(REPO_ROOT, filename)
    with open(path, 'rb') as f:
        return f.read()


def _png_dimensions(data):
    """Return (width, height) from a PNG IHDR chunk."""
    # IHDR data starts at byte 16 (8 magic + 4 length + 4 type)
    w, h = struct.unpack('>II', data[16:24])
    return w, h


def _png_bit_depth(data):
    return data[24]


def _png_color_type(data):
    return data[25]


def _ico_header(data):
    """Return (reserved, image_type, count) from an ICO file header."""
    return struct.unpack('<HHH', data[:6])


def _ico_entry(data, index):
    """Return (width, height, color_count, planes, bit_count, img_size, img_offset) for entry at index."""
    offset = 6 + index * 16
    entry = data[offset:offset + 16]
    w, h, color_count, _reserved, planes, bit_count, img_size, img_offset = struct.unpack('<BBBBHHII', entry)
    return w, h, color_count, planes, bit_count, img_size, img_offset


# ---------------------------------------------------------------------------
# apple-touch-icon.png
# ---------------------------------------------------------------------------

class TestAppleTouchIcon(unittest.TestCase):

    def setUp(self):
        self.filename = 'apple-touch-icon.png'
        self.path = os.path.join(REPO_ROOT, self.filename)
        self.data = _read_file(self.filename)

    def test_file_exists(self):
        self.assertTrue(os.path.exists(self.path),
                        f'{self.filename} must exist in repo root')

    def test_file_not_empty(self):
        self.assertGreater(len(self.data), 0,
                           f'{self.filename} must not be empty')

    def test_is_valid_png(self):
        self.assertEqual(self.data[:8], PNG_MAGIC,
                         f'{self.filename} must start with the PNG magic bytes')

    def test_width_is_180(self):
        w, _ = _png_dimensions(self.data)
        self.assertEqual(w, 180,
                         'Apple touch icon width must be 180 px (required by iOS)')

    def test_height_is_180(self):
        _, h = _png_dimensions(self.data)
        self.assertEqual(h, 180,
                         'Apple touch icon height must be 180 px (required by iOS)')

    def test_is_square(self):
        w, h = _png_dimensions(self.data)
        self.assertEqual(w, h,
                         'Apple touch icon must be square')

    def test_bit_depth_is_8(self):
        self.assertEqual(_png_bit_depth(self.data), 8,
                         'Apple touch icon must use 8-bit channel depth')

    def test_color_type_is_rgba(self):
        # PNG color type 6 = RGBA
        self.assertEqual(_png_color_type(self.data), 6,
                         'Apple touch icon must be RGBA (color type 6) for transparency support')

    def test_file_size_within_reasonable_bounds(self):
        size = os.path.getsize(self.path)
        self.assertGreater(size, 100,
                           'File size must be larger than 100 bytes')
        self.assertLess(size, 200_000,
                        'File size should be under 200 KB for a web icon')

    def test_contains_ihdr_chunk(self):
        # IHDR chunk type identifier appears at bytes 12-16
        self.assertEqual(self.data[12:16], b'IHDR',
                         'PNG must contain an IHDR chunk')

    def test_contains_iend_chunk(self):
        self.assertIn(b'IEND', self.data,
                      'PNG must contain a valid IEND chunk')

    def test_not_an_ico_file(self):
        self.assertNotEqual(self.data[:4], ICO_MAGIC,
                            'apple-touch-icon.png must not be an ICO file')

    def test_filename_convention(self):
        """Apple touch icons must be named apple-touch-icon.png per the Apple spec."""
        self.assertEqual(self.filename, 'apple-touch-icon.png')


# ---------------------------------------------------------------------------
# favicon-32.png
# ---------------------------------------------------------------------------

class TestFavicon32Png(unittest.TestCase):

    def setUp(self):
        self.filename = 'favicon-32.png'
        self.path = os.path.join(REPO_ROOT, self.filename)
        self.data = _read_file(self.filename)

    def test_file_exists(self):
        self.assertTrue(os.path.exists(self.path),
                        f'{self.filename} must exist in repo root')

    def test_file_not_empty(self):
        self.assertGreater(len(self.data), 0,
                           f'{self.filename} must not be empty')

    def test_is_valid_png(self):
        self.assertEqual(self.data[:8], PNG_MAGIC,
                         f'{self.filename} must start with the PNG magic bytes')

    def test_width_is_32(self):
        w, _ = _png_dimensions(self.data)
        self.assertEqual(w, 32,
                         'favicon-32.png width must be exactly 32 px')

    def test_height_is_32(self):
        _, h = _png_dimensions(self.data)
        self.assertEqual(h, 32,
                         'favicon-32.png height must be exactly 32 px')

    def test_is_square(self):
        w, h = _png_dimensions(self.data)
        self.assertEqual(w, h,
                         'favicon-32.png must be square')

    def test_bit_depth_is_8(self):
        self.assertEqual(_png_bit_depth(self.data), 8,
                         'favicon-32.png must use 8-bit channel depth')

    def test_color_type_is_rgba(self):
        self.assertEqual(_png_color_type(self.data), 6,
                         'favicon-32.png must be RGBA (color type 6) for transparency support')

    def test_file_size_within_reasonable_bounds(self):
        size = os.path.getsize(self.path)
        self.assertGreater(size, 67,
                           'File size must be larger than 67 bytes (minimum PNG overhead)')
        self.assertLess(size, 10_000,
                        'A 32x32 favicon should be well under 10 KB')

    def test_contains_ihdr_chunk(self):
        self.assertEqual(self.data[12:16], b'IHDR',
                         'PNG must contain an IHDR chunk')

    def test_contains_iend_chunk(self):
        self.assertIn(b'IEND', self.data,
                      'PNG must contain a valid IEND chunk')

    def test_not_an_ico_file(self):
        self.assertNotEqual(self.data[:4], ICO_MAGIC,
                            'favicon-32.png must not be an ICO file')

    def test_smaller_than_apple_touch_icon(self):
        """32px favicon must be smaller in bytes than the 180px touch icon."""
        touch_icon_size = os.path.getsize(os.path.join(REPO_ROOT, 'apple-touch-icon.png'))
        self.assertLess(os.path.getsize(self.path), touch_icon_size,
                        'favicon-32.png should be smaller than apple-touch-icon.png')


# ---------------------------------------------------------------------------
# favicon.ico
# ---------------------------------------------------------------------------

class TestFaviconIco(unittest.TestCase):

    def setUp(self):
        self.filename = 'favicon.ico'
        self.path = os.path.join(REPO_ROOT, self.filename)
        self.data = _read_file(self.filename)

    def test_file_exists(self):
        self.assertTrue(os.path.exists(self.path),
                        f'{self.filename} must exist in repo root')

    def test_file_not_empty(self):
        self.assertGreater(len(self.data), 0,
                           f'{self.filename} must not be empty')

    def test_is_valid_ico(self):
        self.assertEqual(self.data[:4], ICO_MAGIC,
                         'favicon.ico must start with the ICO magic bytes (00 00 01 00)')

    def test_ico_type_field_is_1(self):
        _, ico_type, _ = _ico_header(self.data)
        self.assertEqual(ico_type, 1,
                         'ICO type field must be 1 (icon, not cursor)')

    def test_ico_reserved_field_is_zero(self):
        reserved, _, _ = _ico_header(self.data)
        self.assertEqual(reserved, 0,
                         'ICO reserved field must be 0')

    def test_ico_contains_at_least_one_image(self):
        _, _, count = _ico_header(self.data)
        self.assertGreaterEqual(count, 1,
                                'favicon.ico must contain at least one embedded image')

    def test_first_image_width_is_16(self):
        w, _, _, _, _, _, _ = _ico_entry(self.data, 0)
        # In ICO format, 0 means 256
        effective_w = 256 if w == 0 else w
        self.assertEqual(effective_w, 16,
                         'First ICO image must be 16x16 px')

    def test_first_image_height_is_16(self):
        _, h, _, _, _, _, _ = _ico_entry(self.data, 0)
        effective_h = 256 if h == 0 else h
        self.assertEqual(effective_h, 16,
                         'First ICO image must be 16x16 px')

    def test_first_image_is_32bit(self):
        _, _, _, _, bit_count, _, _ = _ico_entry(self.data, 0)
        self.assertEqual(bit_count, 32,
                         'ICO image must be 32-bit for alpha channel support')

    def test_image_data_size_is_positive(self):
        _, _, _, _, _, img_size, _ = _ico_entry(self.data, 0)
        self.assertGreater(img_size, 0,
                           'Embedded image data size must be positive')

    def test_image_data_offset_is_within_file(self):
        _, _, _, _, _, img_size, img_offset = _ico_entry(self.data, 0)
        self.assertLess(img_offset, len(self.data),
                        'Image data offset must be within the file')
        self.assertLessEqual(img_offset + img_size, len(self.data),
                             'Image data must not extend past end of file')

    def test_file_size_within_reasonable_bounds(self):
        size = os.path.getsize(self.path)
        self.assertGreater(size, 40,
                           'ICO file must be larger than the minimum header size')
        self.assertLess(size, 100_000,
                        'favicon.ico should be under 100 KB')

    def test_not_a_png_file(self):
        self.assertNotEqual(self.data[:8], PNG_MAGIC,
                            'favicon.ico must not be a PNG file')

    def test_header_size_consistent_with_entry_count(self):
        _, _, count = _ico_header(self.data)
        # Minimum file size: 6 (header) + count * 16 (directory entries)
        min_size = 6 + count * 16
        self.assertGreaterEqual(len(self.data), min_size,
                                'File must be large enough for all declared directory entries')


# ---------------------------------------------------------------------------
# Cross-asset consistency tests
# ---------------------------------------------------------------------------

class TestAssetConsistency(unittest.TestCase):

    def test_all_three_assets_exist(self):
        for filename in ('apple-touch-icon.png', 'favicon-32.png', 'favicon.ico'):
            path = os.path.join(REPO_ROOT, filename)
            self.assertTrue(os.path.exists(path),
                            f'{filename} must be present in repo root')

    def test_png_assets_share_same_color_type(self):
        """Both PNG assets should use RGBA so they have a consistent appearance."""
        atc = _read_file('apple-touch-icon.png')
        f32 = _read_file('favicon-32.png')
        self.assertEqual(_png_color_type(atc), _png_color_type(f32),
                         'Both PNG assets should use the same PNG color type')

    def test_png_assets_share_same_bit_depth(self):
        atc = _read_file('apple-touch-icon.png')
        f32 = _read_file('favicon-32.png')
        self.assertEqual(_png_bit_depth(atc), _png_bit_depth(f32),
                         'Both PNG assets should use the same bit depth')

    def test_apple_touch_icon_is_larger_than_favicon_png(self):
        w_atc, _ = _png_dimensions(_read_file('apple-touch-icon.png'))
        w_f32, _ = _png_dimensions(_read_file('favicon-32.png'))
        self.assertGreater(w_atc, w_f32,
                           'apple-touch-icon.png must be larger than favicon-32.png')

    def test_no_asset_is_an_empty_placeholder(self):
        """Guard against accidentally committing a zero-byte placeholder file."""
        for filename in ('apple-touch-icon.png', 'favicon-32.png', 'favicon.ico'):
            size = os.path.getsize(os.path.join(REPO_ROOT, filename))
            self.assertGreater(size, 0, f'{filename} must not be a zero-byte placeholder')


if __name__ == '__main__':
    unittest.main()
