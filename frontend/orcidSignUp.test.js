const { handleOrcidResponse } = require('./orcidSignUp');

delete window.location;
window.location = { href: "" };

test("handleOrcidResponse should parse ORCID response and redirect", () => {
    const name = "Jane Doe";
    const email = "jane@example.com";
    const fakeResponse = `name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;

    const result = handleOrcidResponse(fakeResponse);

    expect(result).toEqual({ name, email });
    expect(window.location.href).toBe("signedUp.html");
});
