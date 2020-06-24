const { createServer } = require('http');

const WebSocket = require('ws')

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

let server

afterEach(function(done)
{
  if(!server) return done()

  server.close(done)
  server = null
})

test.skip("id", function (done) {
  server = createServer()
  .once('error', done)
  .once('listening', onListening)
  .once('upgrade', schuko())
  .listen()

  function onListening() {
    const {port} = server.address()

    const ws1 = new WebSocket(`ws:localhost:${port}/id`)
    const ws2 = new WebSocket(`ws:localhost:${port}/id`)

    const expected = 'asdf'

    ws2.addEventListener('open', function()
    {
      this.send(expected)
    })

    ws1.addEventListener('message', function({data})
    {
      expect(data).toBe(expected)

      done()
    })
  }
});
