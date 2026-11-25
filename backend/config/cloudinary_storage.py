
from pathlib import PurePosixPath

from django.core.files.storage import Storage

import cloudinary.uploader
from cloudinary import CloudinaryImage


class CloudinaryMediaStorage(Storage):

    def _get_public_id(self, name):
        return PurePosixPath(name).with_suffix("").as_posix()

    def _save(self, name, content):
        public_id = self._get_public_id(name)

        cloudinary.uploader.upload(
            content,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
        )

        return name

    def url(self, name):
        public_id = self._get_public_id(name)
        extension = PurePosixPath(name).suffix.lstrip(".").lower()

        if extension == "jpeg":
            extension = "jpg"

        options = {"secure": True}

        if extension:
            options["format"] = extension

        return CloudinaryImage(public_id).build_url(**options)

    def exists(self, name):
        return False

    def get_available_name(self, name, max_length=None):
        return name

    def delete(self, name):
        cloudinary.uploader.destroy(
            self._get_public_id(name),
            resource_type="image",
            invalidate=True,
        )

    def _open(self, name, mode="rb"):
        raise NotImplementedError(
            "Opening files directly from Cloudinary is not supported."
        )
