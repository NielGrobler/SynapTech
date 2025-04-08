// const { handleCredentialResponse } = require('./googleSignUp');


// test(response, () => {
//     expect(handleCredentialResponse(response)).toBe(payload);
//   });

const { handleCredentialResponse } = require('./googleSignUp');

// 1. Mock window.location
delete window.location;
window.location = { href: "" };

// 2. Create a fake JWT
const fakePayload = {
  name: "Jane Doe",
  email: "jane@example.com"
};
const base64Payload = Buffer.from(JSON.stringify(fakePayload)).toString('base64');
const fakeToken = `header.${base64Payload}.signature`;

test("handleCredentialResponse should decode JWT and redirect", () => {
  const response = { credential: fakeToken };

  const result = handleCredentialResponse(response);

  expect(result).toEqual(fakePayload);
  expect(window.location.href).toBe("signedUp.html");
});
