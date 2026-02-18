"""Custom tools for Faceless Video Factory agents."""

import os
from urllib.parse import quote

import httpx
from agno.tools import Toolkit


class PollinationsTools(Toolkit):
    """Toolkit for generating media via pollinations.ai API."""

    def __init__(
        self,
        enable_video: bool = True,
        enable_audio: bool = True,
        enable_image: bool = True,
        api_key: str | None = None,
    ):
        self.api_key = api_key or os.getenv("POLLINATIONS_API_KEY")
        self.base_url = "https://gen.pollinations.ai"

        tools = []
        if enable_video:
            tools.append(self.generate_video)
        if enable_audio:
            tools.append(self.generate_audio)
        if enable_image:
            tools.append(self.generate_image)

        super().__init__(name="pollinations", tools=tools)

    def generate_video(
        self,
        prompt: str,
        duration: int = 5,
        model: str = "seedance",
    ) -> str:
        """Generate a short video clip from a text prompt.

        Args:
            prompt: Description of the video to generate.
            duration: Approximate duration in seconds (default: 5).
            model: Video model to use (default: seedance).

        Returns:
            URL to the generated video.
        """
        encoded_prompt = quote(prompt)
        url = f"{self.base_url}/video/{encoded_prompt}"

        # Pollinations returns the video directly at this URL
        # Add model and duration as query params for future compatibility
        params = {"model": model}
        if self.api_key:
            params["key"] = self.api_key

        # Make request to trigger generation and get result URL
        response = httpx.get(url, params=params, timeout=120.0)

        if response.status_code == 200:
            # The response is the video content or redirect URL
            return str(response.url)
        else:
            return f"Error generating video: {response.status_code}"

    def generate_audio(
        self,
        text: str,
        voice: str = "nova",
    ) -> str:
        """Generate text-to-speech audio from text.

        Args:
            text: The text to convert to speech.
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer).

        Returns:
            URL to the generated audio file.
        """
        encoded_text = quote(text)
        url = f"{self.base_url}/audio/{encoded_text}"

        params = {"voice": voice}
        if self.api_key:
            params["key"] = self.api_key

        response = httpx.get(url, params=params, timeout=60.0)

        if response.status_code == 200:
            return str(response.url)
        else:
            return f"Error generating audio: {response.status_code}"

    def generate_image(
        self,
        prompt: str,
        style: str = "cinematic",
        model: str = "flux",
    ) -> str:
        """Generate an image from a text prompt.

        Args:
            prompt: Description of the image to generate.
            style: Style modifier (appended to prompt).
            model: Image model to use (flux, gpt-image, etc.).

        Returns:
            URL to the generated image.
        """
        full_prompt = f"{prompt}, {style}"
        encoded_prompt = quote(full_prompt)
        url = f"{self.base_url}/image/{encoded_prompt}"

        params = {"model": model}
        if self.api_key:
            params["key"] = self.api_key

        response = httpx.get(url, params=params, timeout=60.0)

        if response.status_code == 200:
            return str(response.url)
        else:
            return f"Error generating image: {response.status_code}"


__all__ = ["PollinationsTools"]
