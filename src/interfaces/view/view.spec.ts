// DRAFT (TODO)
// import { Module } from '../index'
// import { viewHandler } from './view'
// import testBed from './_testBed.spec'
// import h from 'snabbdom/h'


//   describe('View interface behaviours', function() {

//     // Element placeholder for inserting the app
//     let appElement, app: Module

//     jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000

//     beforeAll(done => {
//       appElement = document.createElement('div')
//       appElement.id = 'app'
//       document.body.appendChild(appElement)
//       app = testBed(i => (ctx, s) =>
//         h('div', {
//           hook: {
//             insert: done,
//           },
//           on: {
//             click: i.inc(ctx),
//           },
//         }, s.count + '')
//       , viewHandler('#app'))
//     })

//     // TODO: clea this!!
//     // afterEach(() => {
//     //   document.getElementById('app').remove()
//     //   if (!app.isDisposed) {
//     //     // app.dispose()
//     //   }
//     // })

//     it('should have initial state', () => {
//       let appElm = document.getElementById('app')
//       expect(appElm.children[0].textContent).toBe('0')
//     })

//     it('should react to input', done => {
//       let expectSubscriber = vnode => {
//         expect(vnode.elm.children[0].textContent).toBe('1')
//         app.interfaces['interfaceObj'].state$.unsubscribe(expectSubscriber)
//         done()
//       }
//       app.interfaces['interfaceObj'].state$.subscribe(expectSubscriber)
//       // create and dispatch a click event
//       let event = new Event('click')
//       let appElm = document.getElementById('app')
//       appElm.children[0].dispatchEvent(event)
//     })

//   })
