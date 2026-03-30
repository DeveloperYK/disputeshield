from app.services.auth import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    password = "mysecretpassword"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)


def test_wrong_password():
    hashed = hash_password("correct_password")
    assert not verify_password("wrong_password", hashed)


def test_create_and_decode_token():
    data = {"sub": "test@example.com"}
    token = create_access_token(data)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "test@example.com"


def test_invalid_token():
    decoded = decode_access_token("invalid.token.here")
    assert decoded is None
