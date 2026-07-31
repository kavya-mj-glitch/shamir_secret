"""
shamir_utils.py

Utility functions for splitting and recovering AES-256 keys
using the shamirs library.
"""

from __future__ import annotations

from typing import List

import shamirs
# Prime modulus larger than any 256-bit AES key.
# This value MUST be the same for every team member.
YOUR_PRIME = 2**521 - 1

def split_key(aes_key: bytes, num_shares: int, threshold: int) -> List[str]:
    """
    Split a 32-byte AES key into Shamir shares.

    Args:
        aes_key: AES-256 key (32 bytes)
        num_shares: Total number of shares (N)
        threshold: Minimum shares required (K)

    Returns:
        List of Base64-encoded share strings.
    """

    if not isinstance(aes_key, bytes):
        raise TypeError("aes_key must be bytes")

    if len(aes_key) != 32:
        raise ValueError("AES-256 key must be exactly 32 bytes")

    if threshold < 2:
        raise ValueError("Threshold must be at least 2")

    if num_shares < threshold:
        raise ValueError("Number of shares must be >= threshold")

    # Convert bytes to integer
    secret_int = int.from_bytes(aes_key, byteorder="big")

    # Generate shares
    share_objects = shamirs.shares(
        secret_int,
        quantity=num_shares,
        modulus=YOUR_PRIME,
        threshold=threshold,
    )

    # Convert shares to Base64 strings
    return [share.to_base64() for share in share_objects]
def recover_key(encoded_shares: List[str]) -> bytes:
    if len(encoded_shares) < 2:
        raise ValueError("At least two shares are required.")

    try:
        share_objects = [
            shamirs.share.from_base64(share)
            for share in encoded_shares
        ]

        secret_int = shamirs.interpolate(
            share_objects,
            threshold=len(share_objects)
        )

        # Check that the recovered integer fits in 32 bytes
        if secret_int.bit_length() > 256:
            raise ValueError(
                "Failed to recover the AES key. "
                "Not enough valid shares or incorrect shares were provided."
            )

        return secret_int.to_bytes(32, byteorder="big")

    except Exception as e:
        raise ValueError(f"Key recovery failed: {e}")