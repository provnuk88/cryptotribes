module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'standard'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    rules: {
        // Основные правила
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        
        // Переменные
        'no-var': 'error',
        'prefer-const': 'error',
        'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        
        // Функции
        'func-style': ['error', 'expression'],
        'arrow-spacing': 'error',
        'no-confusing-arrow': 'error',
        
        // Объекты
        'object-curly-spacing': ['error', 'always'],
        'object-shorthand': 'error',
        
        // Массивы
        'array-bracket-spacing': ['error', 'never'],
        'array-callback-return': 'error',
        
        // Строки
        'template-curly-spacing': 'error',
        'no-template-curly-in-string': 'error',
        
        // Условия
        'no-else-return': 'error',
        'no-nested-ternary': 'error',
        
        // Безопасность
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
        
        // Логика
        'no-unreachable': 'error',
        'no-unreachable-loop': 'error',
        
        // Асинхронность
        'require-await': 'error',
        'no-async-promise-executor': 'error',
        
        // Промисы
        'prefer-promise-reject-errors': 'error',
        'no-promise-executor-return': 'error',
        
        // Импорты
        'import/order': ['error', {
            'groups': [
                'builtin',
                'external',
                'internal',
                'parent',
                'sibling',
                'index'
            ],
            'newlines-between': 'always'
        }],
        
        // Документация
        'valid-jsdoc': ['warn', {
            'requireReturn': false,
            'requireReturnDescription': false
        }],
        
        // Сложность
        'complexity': ['warn', 10],
        'max-depth': ['warn', 4],
        'max-lines': ['warn', 300],
        'max-params': ['warn', 5],
        
        // Отступы и форматирование
        'no-multiple-empty-lines': ['error', { 'max': 2 }],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        
        // Комментарии
        'spaced-comment': ['error', 'always'],
        'multiline-comment-style': ['error', 'starred-block'],
        
        // Именование
        'camelcase': ['error', { 'properties': 'never' }],
        'new-cap': 'error',
        
        // Ошибки
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-alert': 'error',
        
        // Пространства имен
        'no-undef': 'error',
        'no-global-assign': 'error',
        
        // Производительность
        'no-loop-func': 'error',
        'no-new-object': 'error',
        'no-new-array': 'error',
        
        // Читаемость
        'operator-linebreak': ['error', 'before'],
        'nonblock-statement-body-position': ['error', 'beside'],
        
        // Безопасность Node.js
        'node/no-deprecated-api': 'error',
        'node/no-missing-import': 'error',
        'node/no-unpublished-import': 'error',
        
        // Jest
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error'
    },
    overrides: [
        {
            files: ['tests/**/*.js'],
            env: {
                jest: true
            },
            rules: {
                'no-console': 'off',
                'max-lines': 'off'
            }
        },
        {
            files: ['server/**/*.js'],
            rules: {
                'no-console': 'off' // Разрешаем console в серверном коде
            }
        }
    ],
    ignorePatterns: [
        'node_modules/',
        'coverage/',
        'logs/',
        'public/',
        '*.min.js'
    ]
}; 