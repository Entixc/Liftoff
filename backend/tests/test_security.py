from app.core.security import hash_password, verify_password


def test_hash_password_does_not_return_plaintext() -> None:
    assert "strongpass" != hash_password("strongpass")


def test_verify_password_accepts_correct_password() -> None:
    assert verify_password("correctpass", hash_password("correctpass"))


def test_verify_password_rejects_wrong_password() -> None:
    assert not verify_password("incorrectpass", hash_password("correctpass"))

