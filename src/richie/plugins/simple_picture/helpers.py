"""SimplePicture plugin for DjangoCMS."""

import logging

from .defaults import SIMPLEPICTURE_PRESETS

logger = logging.getLogger(__name__)


def get_picture_info(instance, preset_name):
    """
    Compute picture information for a given preset defined in settings.

    A preset is of the form:

    "default": {
        "src": {"size": (1000, 1000), "crop": "smart"}, # easythumbnail options
        "srcset": [
            {
                "options": {"size": (800, 800), "crop": "smart"},
                "descriptor": "800w",
            },
            {
                "options": {"size": (600, 600), "crop": "smart"},
                "descriptor": "600w",
            },
        ],
        "sizes": "100vw", # e.g 1000px or 100vw
    }

    """
    logger.info(
        "Generating picture info for %s with preset %s",
        instance,
        preset_name,
    )
    # Bail out if the picture does not have an image as that's the object we use to get
    # all the information we need to return any picture info.
    if not instance.picture:
        return None

    thumbnailer = instance.picture.easy_thumbnails_thumbnailer

    # Look for the preset in settings and fallback to "default"
    preset = SIMPLEPICTURE_PRESETS.get(preset_name, SIMPLEPICTURE_PRESETS["default"])

    # Complete picture information with thumbnails url calculated according to what is
    # defined in the preset
    picture_info = {}
    location_dict = {"subject_location": instance.picture.subject_location}

    # - src
    options = preset["src"].copy()
    options.update(location_dict)
    try:
        picture_info["src"] = thumbnailer.get_thumbnail(options).url
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.error(
            "Error while generating thumbnail for %s with %s: %s",
            instance.picture,
            options,
            exc,
        )
        return None

    # - srcset
    srcset = []
    for info in preset.get("srcset", []):
        options = info["options"].copy()
        options.update(location_dict)
        try:
            url = thumbnailer.get_thumbnail(options).url
            srcset.append(f"{url:s} {info['descriptor']:s}")
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.error(
                "Error while generating thumbnail for %s with %s: %s",
                instance.picture,
                options,
                exc,
            )
    picture_info["srcset"] = ", ".join(srcset) if srcset else None

    # - sizes
    picture_info["sizes"] = preset.get("sizes")

    return picture_info
