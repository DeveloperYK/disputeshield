def test_list_disputes_empty(client, auth_headers):
    response = client.get("/api/disputes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["disputes"] == []
    assert data["total"] == 0


def test_list_disputes_unauthenticated(client):
    response = client.get("/api/disputes")
    assert response.status_code == 401


def test_get_dispute_not_found(client, auth_headers):
    response = client.get(
        "/api/disputes/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404
