import { describe, expect, test } from 'vitest'
import { parseCollectorNumber } from './parseCollectorNumber'

describe('parseCollectorNumber', () => {
  test('format N/M : localId + total', () => {
    expect(parseCollectorNumber('025/165')).toMatchObject({ localId: '25', total: 165 })
    expect(parseCollectorNumber('4/102')).toMatchObject({ localId: '4', total: 102 })
  })

  test('tolère le bruit OCR autour du numéro', () => {
    const noisy = 'Illus. 5ban Graphics\n©2023 Pokémon  125 / 197  \nDarkness'
    expect(parseCollectorNumber(noisy)).toMatchObject({ localId: '125', total: 197 })
  })

  test('nombre isolé : localId sans total', () => {
    expect(parseCollectorNumber('No. 058 vintage')).toMatchObject({
      localId: '58',
      total: null,
    })
  })

  test('rien de numérique → null', () => {
    expect(parseCollectorNumber('Pikachu\nBasic Pokémon')).toMatchObject({
      localId: null,
      total: null,
    })
  })

  test('conserve le texte brut pour le debug', () => {
    expect(parseCollectorNumber('25/165').raw).toBe('25/165')
  })
})
