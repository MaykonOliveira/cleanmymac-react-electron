import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const { version, build = {} } = packageJson;
const {
  appId,
  mac = {},
  mas = {},
  masDev = {}
} = build;

const errors = [];

if (!appId || !/^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/.test(appId)) {
  errors.push('build.appId ausente ou inválido (esperado reverse-DNS, ex: com.company.app).');
}

if (!version || !/^\d+\.\d+\.\d+([-.][A-Za-z0-9.]+)?$/.test(version)) {
  errors.push('version ausente ou fora do padrão semver esperado pela App Store Connect.');
}

const allowedCategories = new Set([
  'public.app-category.business',
  'public.app-category.developer-tools',
  'public.app-category.education',
  'public.app-category.entertainment',
  'public.app-category.finance',
  'public.app-category.games',
  'public.app-category.graphics-design',
  'public.app-category.healthcare-fitness',
  'public.app-category.lifestyle',
  'public.app-category.medical',
  'public.app-category.music',
  'public.app-category.news',
  'public.app-category.photography',
  'public.app-category.productivity',
  'public.app-category.reference',
  'public.app-category.social-networking',
  'public.app-category.sports',
  'public.app-category.travel',
  'public.app-category.utilities',
  'public.app-category.video',
  'public.app-category.weather'
]);

const category = mac.category;
if (!category || !allowedCategories.has(category)) {
  errors.push('build.mac.category ausente ou não está na lista de categorias aceitas pela Apple.');
}

if (mas.category && mas.category !== category) {
  errors.push('build.mas.category precisa ser igual a build.mac.category.');
}

if (masDev.category && masDev.category !== category) {
  errors.push('build.masDev.category precisa ser igual a build.mac.category.');
}

if (errors.length > 0) {
  console.error('❌ Validação de metadados falhou:');
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log('✅ Metadados validados: appId, versão e categoria estão consistentes para App Store Connect.');
console.log(`appId: ${appId}`);
console.log(`version: ${version}`);
console.log(`category: ${category}`);
