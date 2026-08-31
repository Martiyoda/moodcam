// Verifica que las recetas usan colores y parametros disponibles en la estacion.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
    WRO_PAINTER_RECIPES,
    WRO_PRESENTATION_ARTIST_IDS,
    WRO_PHYSICAL_COLORS,
    getPainterRecipe,
    getRecipeColorsForEmotion,
    isPhysicalColor,
    recipeToPromptContext,
} from './painterRecipes.js'

test('define recetas WRO solo para los cuatro pintores de presentacion', () => {
    assert.deepEqual(WRO_PRESENTATION_ARTIST_IDS, [
        'kandinsky',
        'pollock',
        'rothko',
        'alma-thomas',
    ])

    assert.deepEqual(WRO_PAINTER_RECIPES.map((recipe) => recipe.artist_id), WRO_PRESENTATION_ARTIST_IDS)
})

test('limita la paleta fisica inicial a cuatro colores', () => {
    assert.deepEqual(WRO_PHYSICAL_COLORS.map((color) => color.id), ['blue', 'violet', 'red', 'yellow'])
    assert.equal(isPhysicalColor('orange'), false)
    assert.equal(isPhysicalColor('black'), false)
})

test('resuelve colores de receta dentro de la paleta fisica', () => {
    const recipe = getPainterRecipe('pollock')
    const colors = getRecipeColorsForEmotion(recipe, 'surprise')

    assert.ok(colors.length > 0)
    assert.ok(colors.every(isPhysicalColor))
})

test('serializa contexto acotado para prompts del AI Bridge', () => {
    const context = recipeToPromptContext(getPainterRecipe('rothko'))

    assert.equal(context.recipe_id, 'rothko-wro-v1')
    assert.equal(context.artist_id, 'rothko')
    assert.deepEqual(context.physical_colors, ['blue', 'violet', 'red', 'yellow'])
    assert.equal(context.max_strokes_per_chunk, 3)
    assert.ok(context.allowed_gestures.includes('wash'))
})
