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

describe('id', function()
{
  let port
  let server

  beforeEach(function(done)
  {
    server = createServer()
    .once('error', done)
    .on('upgrade', schuko())
    .listen(function() {
      ({port} = server.address())

      done()
    })
  })

  afterEach(function(done)
  {
    if(!server) return done()

    server.close(done)
    server = null
  })

  test("close when not connected", function (done) {
    const ws1 = new WebSocket(`ws:localhost:${port}/id`)

    ws1.addEventListener('open', function()
    {
      this.close()
    })

    ws1.addEventListener('close', function({code})
    {
      expect(code).toBe(1005)

      done()
    })
  });

  test("full connection", function (done) {
    const ws1 = new WebSocket(`ws:localhost:${port}/id`)
    const ws2 = new WebSocket(`ws:localhost:${port}/id`)

    const expected = 'asdf'

    ws1.addEventListener('open', ws1.send.bind(ws1, expected))

    ws2.addEventListener('message', function({data})
    {
      expect(data).toBe(expected)

      ws1.close()
    })

    ws2.addEventListener('close', function({code})
    {
      expect(code).toBe(1005)

      done()
    })
  });
})
