import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/sbx.js',
  format: 'cjs',
  plugins: [ babel() ],
  dest: 'dist/sbx.js'
}