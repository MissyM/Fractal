import {
  Actions,
  Inputs,
  Interfaces,
  StyleGroup,
  clone,
} from '../../core'
import { View, h } from '../..//interfaces/view'

import * as List from './List'
import * as Note from './Note'

export const name = 'Root'

export const state = {
  _nest: {
    List: clone(List),
    Note: clone(Note),
  },
}

export type S = typeof state

export const inputs: Inputs = ctx => ({
})

export const actions: Actions<S> = {
}

const view: View<S> = ({ ctx, vw }) => s => {
  let style = ctx.groups.style

  return h('div', {
    key: ctx.name,
    class: { [style.base]: true },
  }, [
    vw('List'),
    vw('Note'),
  ])
}

export const interfaces: Interfaces = { view }

const style: StyleGroup = {
  base: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
}

export const groups = { style }
