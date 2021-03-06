'use strict'
import React from 'react'
import { exec } from 'child_process'
import Preview from './Preview'
import Hint from './Preview/Hint'

import { memoize }  from 'cerebro-tools'
import shellHistory from 'shell-history'
import shellEnv  from 'shell-env'
import uniq from 'lodash.uniq'

// Plugin constants
const id = 'shell'
const icon = '/Applications/Utilities/Terminal.app'

const MEMOIZE_OPTIONS = {
  length: false,
  promise: 'then',
  maxAge: 5 * 60 * 1000,
  preFetch: true
}

const getHistory = () => (
  Promise.resolve(uniq(shellHistory().reverse()))
)

const getCachedHistory = memoize(getHistory, MEMOIZE_OPTIONS)

const getCachedEnv = memoize(() => {
  const ENV = {}
  return shellEnv().then(env => {
    ENV.env = env
    ENV.cwd = env.HOME || `/Users/${process.env.USER}`
    ENV.shell = env.SHELL
    return ENV
  })
}, MEMOIZE_OPTIONS)

export const fn = ({term, display, update, actions}) => {
  const match = term.match(/^\$\s*(.*)/)
  if (match) {
    const cmd = match[1]
    const title = `Shell command: ${cmd}`

    const onSelect = (event) => {
      event.preventDefault()
      actions.replaceTerm(term)

      // Get user env, execute command and update preview
      getCachedEnv().then(({shell, cwd, env, }) => {
        const { stdout, stderr } = exec(cmd, { shell, env, cwd })
        console.log(stdout, stderr)
        const getPreview = () => (
          <Preview cmd={cmd} stdout={stdout} stderr={stderr} />
        )
        update(id, { getPreview })
      })
    }

    display({
      id, title, icon, onSelect,
      getPreview: () => <Hint />
    })

    getCachedHistory().then(history => {
      // Load shell history and suggest autocomplete after loading
      let autocomplete = history && history.find(item => item != cmd && item.startsWith(cmd))
      autocomplete = autocomplete ? `$ ${autocomplete}` : term
      update(id, {term: autocomplete})
    })
  }
}

export const keyword = '$'
export const name = 'Shell command'
