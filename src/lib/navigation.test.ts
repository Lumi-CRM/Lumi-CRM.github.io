import assert from 'node:assert/strict'
import test from 'node:test'
import { desktopNavigationGroups, isNavigationItemActive, mobileNavigation } from './navigation.ts'

test('mobile navigation exposes exactly five primary work areas', () => {
  assert.deepEqual(mobileNavigation.map(item => item.label), ['Главная', 'Контакты', 'Объекты', 'Дела', 'Сделки'])
  assert.equal(new Set(mobileNavigation.map(item => item.id)).size, 5)
})

test('legacy contact and work routes activate their new hubs', () => {
  const contacts = mobileNavigation.find(item => item.id === '/contacts')!
  const work = mobileNavigation.find(item => item.id === '/work')!
  assert.equal(isNavigationItemActive('/owners', contacts), true)
  assert.equal(isNavigationItemActive('/tenants', contacts), true)
  assert.equal(isNavigationItemActive('/tasks', work), true)
  assert.equal(isNavigationItemActive('/calendar', work), true)
})

test('every desktop item has a unique primary route', () => {
  const routes = desktopNavigationGroups.flatMap(group => group.items.map(item => item.id))
  assert.equal(new Set(routes).size, routes.length)
})

test('mobile drawer exposes every workspace section in addition to the primary bar', () => {
  const drawerRoutes = desktopNavigationGroups.flatMap(group => group.items.map(item => item.id))
  for (const item of mobileNavigation) assert.equal(drawerRoutes.includes(item.id), true)
  assert.deepEqual(
    drawerRoutes.filter(route => ['/documents', '/gallery', '/favorites', '/archive', '/trash', '/settings'].includes(route)),
    ['/documents', '/gallery', '/favorites', '/archive', '/trash', '/settings'],
  )
})
