import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/vm.js',
  format: 'cjs',
  plugins: [ babel() ],
  dest: 'dist/vm.js'
}