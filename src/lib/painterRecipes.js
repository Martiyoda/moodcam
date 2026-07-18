export const WRO_PHYSICAL_COLORS = [
    { id: 'blue', label: 'Azul', hex: '#2563eb' },
    { id: 'violet', label: 'Violeta', hex: '#7c3aed' },
    { id: 'red', label: 'Rojo', hex: '#dc2626' },
    { id: 'yellow', label: 'Amarillo', hex: '#facc15' },
]

const COMMON_LIMITS = {
    max_strokes_per_chunk: 4,
    max_points_per_stroke: 24,
    max_commands_per_chunk: 10,
    max_payload_bytes: 1800,
    pressure_range: [25, 75],
    speed_range: [25, 90],
}

export const WRO_PAINTER_RECIPES = [
    {
        id: 'kandinsky-wro-v1',
        version: '1.0.0',
        artist_id: 'kandinsky',
        artist_name: 'Kandinsky',
        style: 'geometric',
        allowed_gestures: ['circle', 'triangle', 'line', 'arc', 'spiral', 'open_arc'],
        preferred_zones: ['center', 'upper_left', 'lower_right'],
        density_range: [35, 75],
        speed_range: [35, 78],
        pressure_range: [28, 58],
        color_rules: {
            happy: ['yellow', 'red'],
            neutral: ['blue', 'yellow'],
            sad: ['blue', 'violet'],
            angry: ['red', 'violet'],
            fear: ['violet', 'blue'],
            disgust: ['violet', 'yellow'],
            surprise: ['yellow', 'blue'],
        },
        cleanup_strategy: 'on_color_change',
        limits: COMMON_LIMITS,
    },
    {
        id: 'pollock-wro-v1',
        version: '1.0.0',
        artist_id: 'pollock',
        artist_name: 'Pollock',
        style: 'action',
        allowed_gestures: ['splatter', 'flick', 'loop', 'drip', 'broken_line'],
        preferred_zones: ['full_canvas', 'diagonal_path'],
        density_range: [55, 90],
        speed_range: [55, 90],
        pressure_range: [24, 52],
        color_rules: {
            happy: ['yellow', 'red'],
            neutral: ['blue', 'yellow'],
            sad: ['blue', 'violet'],
            angry: ['red', 'yellow'],
            fear: ['violet', 'red'],
            disgust: ['violet', 'yellow'],
            surprise: ['yellow', 'violet'],
        },
        cleanup_strategy: 'after_two_colors',
        limits: { ...COMMON_LIMITS, max_strokes_per_chunk: 5, max_commands_per_chunk: 12 },
    },
    {
        id: 'rothko-wro-v1',
        version: '1.0.0',
        artist_id: 'rothko',
        artist_name: 'Rothko',
        style: 'field',
        allowed_gestures: ['block', 'wash', 'horizon', 'soft_edge'],
        preferred_zones: ['upper_band', 'center_band', 'lower_band'],
        density_range: [20, 50],
        speed_range: [22, 45],
        pressure_range: [35, 62],
        color_rules: {
            happy: ['yellow', 'red'],
            neutral: ['blue', 'violet'],
            sad: ['blue', 'violet'],
            angry: ['red', 'violet'],
            fear: ['violet', 'blue'],
            disgust: ['violet', 'blue'],
            surprise: ['yellow', 'blue'],
        },
        cleanup_strategy: 'on_color_change',
        limits: { ...COMMON_LIMITS, max_strokes_per_chunk: 3, max_points_per_stroke: 16, speed_range: [22, 55] },
    },
    {
        id: 'alma-thomas-wro-v1',
        version: '1.0.0',
        artist_id: 'alma-thomas',
        artist_name: 'Alma Thomas',
        style: 'mosaic',
        allowed_gestures: ['dash', 'mosaic', 'short_arc', 'column', 'ring'],
        preferred_zones: ['columns', 'radial_pattern', 'center'],
        density_range: [45, 82],
        speed_range: [34, 68],
        pressure_range: [28, 50],
        color_rules: {
            happy: ['yellow', 'red'],
            neutral: ['blue', 'yellow'],
            sad: ['violet', 'blue'],
            angry: ['red', 'violet'],
            fear: ['violet', 'blue'],
            disgust: ['violet', 'yellow'],
            surprise: ['yellow', 'violet'],
        },
        cleanup_strategy: 'on_color_change',
        limits: { ...COMMON_LIMITS, max_strokes_per_chunk: 5, max_points_per_stroke: 8 },
    },
]

export function getPhysicalColor(colorId) {
    return WRO_PHYSICAL_COLORS.find((color) => color.id === colorId) || WRO_PHYSICAL_COLORS[0]
}

export function isPhysicalColor(colorId) {
    return WRO_PHYSICAL_COLORS.some((color) => color.id === colorId)
}

export function getPainterRecipe(artistId) {
    return WRO_PAINTER_RECIPES.find((recipe) => recipe.artist_id === artistId) || WRO_PAINTER_RECIPES[0]
}

export function getPainterRecipeById(recipeId) {
    return WRO_PAINTER_RECIPES.find((recipe) => recipe.id === recipeId) || null
}

export function getRecipeColorsForEmotion(recipe, emotion) {
    const resolvedRecipe = recipe || WRO_PAINTER_RECIPES[0]
    const colors = resolvedRecipe.color_rules?.[emotion] || resolvedRecipe.color_rules?.neutral || ['blue', 'yellow']
    return colors.filter(isPhysicalColor)
}

export function recipeToPromptContext(recipe) {
    const resolvedRecipe = recipe || WRO_PAINTER_RECIPES[0]
    return {
        recipe_id: resolvedRecipe.id,
        recipe_version: resolvedRecipe.version,
        artist_id: resolvedRecipe.artist_id,
        style: resolvedRecipe.style,
        allowed_gestures: resolvedRecipe.allowed_gestures,
        physical_colors: WRO_PHYSICAL_COLORS.map((color) => color.id),
        density_range: resolvedRecipe.density_range,
        speed_range: resolvedRecipe.speed_range,
        pressure_range: resolvedRecipe.pressure_range,
        max_strokes_per_chunk: resolvedRecipe.limits.max_strokes_per_chunk,
        max_points_per_stroke: resolvedRecipe.limits.max_points_per_stroke,
    }
}
