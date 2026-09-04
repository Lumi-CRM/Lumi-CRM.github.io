import assert from 'node:assert/strict'
import test from 'node:test'
import { desktopNavigationGroups, isNavigationItemActive } from './navigation.ts'

test('legacy contact and work routes activate their new hubs', () => {
  const items = desktopNavigationGroups.flatMap(group => group.items)
  const contacts = items.find(item => item.id === '/contacts')!
  const work = items.find(item => item.id === '/work')!
  assert.equal(isNavigationItemActive('/owners', contacts), true)
  assert.equal(isNavigationItemActive('/tenants', contacts), true)
  assert.equal(isNavigationItemActive('/tasks', work), true)
  assert.equal(isNavigationItemActive('/calendar', work), true)
})

test('every desktop item has a unique primary route', () => {
  const routes = desktopNavigationGroups.flatMap(group => group.items.map(item => item.id))
  assert.equal(new Set(routes).size, routes.length)
})

test('drawer exposes every workspace section', () => {
  const drawerRoutes = desktopNavigationGroups.flatMap(group => group.items.map(item => item.id))
  assert.deepEqual(
    drawerRoutes,
    ['/', '/work', '/deals', '/contacts', '/properties', '/documents', '/gallery', '/favorites', '/archive', '/trash', '/settings'],
  )
})
