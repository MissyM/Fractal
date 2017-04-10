import { Component, Actions, Inputs, ev, merge, unmerge, clone } from '../../core'
import { action, vw, props, toChild, stateOf, toIt } from '../../utils/component'
import { StyleGroup, clickable } from '../../utils/style'
import { View } from '../../interfaces/view'
import h from 'snabbdom/h'

import Item from './item'

const name = 'Root'

const state = {
  text: '',
  numItems: 0,
  items: {},
}

const inputs: Inputs = ctx => ({
  action: action(actions),
  inputKeyup: ([idx, [keyCode, text]]) => {
    if (keyCode === 13 && text !== '') {
      merge(ctx, idx, props({ text })(clone(Item)))
      return [
        actions.SetText(''),
        actions.New(),
      ]
    } else {
      return actions.SetText(text)
    }
  },
  setCheckAll: (checked: boolean) => {
    let items = stateOf(ctx).items
    for (let i = 0, keys = Object.keys(items), len = keys.length; i < len; i++) {
      toChild(ctx, <any> keys[i], 'action', ['SetChecked', checked])
    }
  },
  removeChecked: () => {
    let items = stateOf(ctx).items
    for (let i = 0, keys = Object.keys(items), len = keys.length; i < len; i++) {
      if (stateOf(ctx, <any>  keys[i]).checked) {
        toIt(ctx, '$$Item_remove', [keys[i]])
      }
    }
  },
  $$Item_remove: ([idx]) => {
    unmerge(ctx, idx)
    return actions.Remove(idx)
  },
})

const actions: Actions = {
  SetText: text => s => {
    s.text = text
    return s
  },
  New: () => s => {
    s.items[s.numItems] = s.numItems
    s.numItems++
    return s
  },
  Remove: idx => s => {
    delete s.items[idx]
    return s
  },
}

const view: View = (ctx, s) => {
  let style = ctx.groups.style

  return h('div', {
    key: ctx.name,
    class: { [style.base]: true },
  }, [
    h('input', {
      class: { [style.input]: true },
      attrs: { placeholder: 'Type and hit enter' },
      props: { value: s.text },
      on: {
        keyup: ev(ctx, 'inputKeyup', s.numItems, [
          ['keyCode'],
          ['target', 'value'],
        ]),
      },
    }),
    h('div', {class: { [style.menuBar]: true }}, [
      h('div', {
        class: { [style.menuItem]: true },
        on: { click: ev(ctx, 'setCheckAll', true) },
      }, 'check all'),
      h('div', {
        class: { [style.menuItem]: true },
        on: { click: ev(ctx, 'setCheckAll', false) },
      }, 'uncheck all'),
      h('div', {
        class: { [style.menuItem]: true },
        on: { click: ev(ctx, 'removeChecked') },
      }, 'remove checked'),
    ]),
    h('ul', {class: { [style.list]: true }},
      Object.keys(s.items).map(
        idx => vw(ctx, idx),
      )
    ),
  ])
}

const generalFont = {
  fontFamily: 'sans-serif',
  fontSize: '22px',
  color: '#292828',
}

const style: StyleGroup = {
  base: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    padding: '20px',
    ...generalFont,
  },
  input: {
    padding: '5px',
    ...generalFont,
    $nest: {
      '&:focus': {
        outline: '2px solid #13A513',
      },
    },
  },
  menuBar: {
    padding: '5px',
    display: 'flex',
  },
  menuItem: {
    margin: '5px',
    padding: '3px 5px',
    fontSize: '16px',
    borderRadius: '4px',
    textDecoration: 'underline',
    color: '#565656',
    ...clickable,
    $nest: {
      '&:hover': {
        backgroundColor: '#c3c6c3',
      },
    },
  },
  list: {
    width: '400px',
  },
}

const comp: Component = {
  name,
  defs: {
    [Item.name]: Item,
  },
  groups: {
    style,
  },
  state,
  inputs,
  actions,
  interfaces: {
    view,
  },
}

export default comp
