const path = require('path');
const prompts = require('prompts');
const {red, reset} = require('kolorist');

const argv = require('minimist')(process.argv.slice(2));
const cwd = process.cwd();

const renameFiles = {
  _gitignore: '.gitignore'
}

async function init() {
  let targetDir = argv[0]
  const defaultProjectName =  !targetDir ?  'c-t-project' : targetDir;
  let result = {};
  try {
    result = await prompts(
      [
        {
          type: 'text',
          name: 'projectName',
          message: reset('Project name:'),
          initial: defaultProjectName,
          onState: (state) =>
            (targetDir = state.value.trim() || defaultProjectName)
        },
        {
          type: 'autocomplete',
          name: 'lang',
          message: 'Use TypeScript?',
          choices: [
            { title: 'TypeScript' },
            { title: 'JavaScript'}
          ]
        },
        {
          type: 'autocomplete',
          name: 'framework',
          message: 'Use React?',
          choices: [
            { title: 'React' },
            { title: 'Vue3'}
          ]
        },
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' Operation cancelled')
        }
      }
    );

  } catch (cancelled) {
      console.log(cancelled.message);
      return
  }

  const {projectName, lang, framework} = result;

  const root = path.join(cwd, projectName);

  fs.mkdirSync(root);

  const template = `${framework === 'React' ? 'react' : ''}${lang === 'TypeScript' ? '-ts' : ''}`

  console.log(`\nScaffolding project in ${root}...`)

  const templateDir = path.join(__dirname, `template-${template}`)

  const write = (file, content) => {
    const targetPath = renameFiles[file]
      ? path.join(root, renameFiles[file])
      : path.join(root, file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter((f) => f !== 'package.json')) {
    write(file)
  }

  const pkg = require(path.join(templateDir, `package.json`))

  pkg.name = packageName || targetDir

  write('package.json', JSON.stringify(pkg, null, 2))

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    console.log(`  cd ${path.relative(cwd, root)}`)
  }

  switch (pkgManager) {
    case 'yarn':
      console.log('  yarn')
      console.log('  yarn dev')
      break
    default:
      console.log(`  ${pkgManager} install`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  console.log()
}

function copy(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

/**
 * @param {string | undefined} userAgent process.env.npm_config_user_agent
 * @returns object | undefined
 */
 function pkgFromUserAgent(userAgent) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1]
  }
}

init().catch((e) => {
  console.error(e);
});