const { once } = require('events')
const { createServer } = require('http')

const WebSocket = require('ws')

const schuko = require("..")

test("smoke", function () {
  expect(schuko).toMatchInlineSnapshot(`[Function]`);
});

test("no arguments", function () {
  const onUpdate = schuko();

  expect(onUpdate).toMatchInlineSnapshot(`[Function]`);
});

test("redirect when there's no connection id", function () {
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

describe('connection id', function()
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

  test("buffer data if send before second socket gets open", function (done) {
    const ws1 = new WebSocket(`ws:localhost:${port}/id`)

    const expected = 'asdf'

    ws1.addEventListener('open', ws1.send.bind(ws1, expected))

    setTimeout(function()
    {
      const ws2 = new WebSocket(`ws:localhost:${port}/id`)

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
    }, 1000)
  });

  describe('peer id', function()
  {
    test('connect to waiting peer', function(done)
    {
      const ws1 = new WebSocket(`ws:localhost:${port}/room`)
      const ws2 = new WebSocket(`ws:localhost:${port}/room?0`)
      const ws3 = new WebSocket(`ws:localhost:${port}/room`)

      const expected = 'asdf'

      ws3.addEventListener('open', function()
      {
        ws1.close()

        this.send(expected)
      })

      ws2.addEventListener('message', function({data})
      {
        expect(data).toBe(expected)

        this.close()
      })

      ws3.addEventListener('close', function({code})
      {
        expect(code).toBe(1005)

        done()
      })
    })

    test("named peer keep listening", function(done)
    {
      const ws1 = new WebSocket(`ws:localhost:${port}/room`)
      const ws2 = new WebSocket(`ws:localhost:${port}/room?0`)

      const expected = 'asdf'

      ws2.addEventListener('open', function()
      {
        ws1.close()
      })

      ws1.addEventListener('close', function()
      {
        const ws3 = new WebSocket(`ws:localhost:${port}/room`)

        ws3.addEventListener('open', function()
        {
          ws2.send(expected)
        })

        ws3.addEventListener('message', function({data})
        {
          expect(data).toBe(expected)

          ws2.close()
        })

        ws3.addEventListener('close', function({code})
        {
          expect(code).toBe(1005)

          done()
        })
      })
    })

    describe("replace named peer with waiting one", function()
    {
      test("keep waiting", function()
      {
        const ws1 = new WebSocket(`ws:localhost:${port}/room`)
        const ws2 = new WebSocket(`ws:localhost:${port}/room?0`)

        const expected = 'asdf'

        let ws3

        return once(ws2, 'open')
        .then(function()
        {
          ws3 = new WebSocket(`ws:localhost:${port}/room?0`)

          ws1.close()

          return once(ws3, 'open')
        })
        .then(function()
        {
          ws2.send(expected)

          ws3.close()

          return once(ws3, 'close')
        })
        .then(function([code])
        {
          expect(ws2.readyState).toBe(WebSocket.CLOSING)

          expect(code).toBe(1005)
        })
      })

      test("connect to new one", function()
      {
        const ws1 = new WebSocket(`ws:localhost:${port}/room`)
        const ws2 = new WebSocket(`ws:localhost:${port}/room?0`)

        const expected = 'asdf'

        let ws3, ws4

        return once(ws2, 'open')
        .then(function()
        {
          ws3 = new WebSocket(`ws:localhost:${port}/room?0`)

          ws1.close()

          return once(ws3, 'open')
        })
        .then(function()
        {
          ws2.send(expected)

          ws4 = new WebSocket(`ws:localhost:${port}/room`)

          ws4.addEventListener('message', function({data})
          {
            expect(data).toBe(expected)

            ws3.close()
          })

          return once(ws4, 'open')
        })
        .then(function()
        {
          expect(ws2.readyState).toBe(WebSocket.CLOSING)

          return once(ws3, 'close')
        })
        .then(function([code])
        {
          expect(ws2.readyState).toBe(WebSocket.CLOSED)

          expect(code).toBe(1005)
        })
      })
    })

    test("replace named listening peer with new one", function()
    {
      const ws1 = new WebSocket(`ws:localhost:${port}/room?0`)

      const expected = 'asdf'

      let ws2, ws3

      return once(ws1, 'open')
      .then(function()
      {
        ws1.send(expected)

        ws2 = new WebSocket(`ws:localhost:${port}/room?0`)

        return once(ws2, 'open')
      })
      .then(function()
      {
        ws3 = new WebSocket(`ws:localhost:${port}/room`)

        ws3.addEventListener('message', function({data})
        {
          expect(data).toBe(expected)

          ws2.close()
        })

        return once(ws3, 'open')
      })
      .then(function()
      {
        expect(ws1.readyState).toBe(WebSocket.CLOSED)

        return once(ws3, 'close')
      })
      .then(function([code])
      {
        expect(code).toBe(1005)
      })
    })
  })
})
