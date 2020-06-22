const schuko = require("..");

test("smoke", function () {
  expect(schuko).toMatchInlineSnapshot(`[Function]`);
});

test("no arguments", function () {
  const onUpdate = schuko();

  expect(onUpdate).toMatchInlineSnapshot(`[Function]`);
});

test("redirect when no id", function () {
  const onUpdate = schuko({
    genId() {
      return "id";
    },
  });

  const req = { url: "/" };
  const socket = {
    end(data) {
      expect(data).toMatchInlineSnapshot(`
        "HTTP/1.1 302 Found
        Location: /id

        "
      `);
    },
  };

  const result = onUpdate(req, socket);

  expect(result).toMatchInlineSnapshot(`undefined`);
});
