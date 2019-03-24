import {
  GraphQLUnionType,
  GraphQLWrappingType,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInputField,
  GraphQLField,
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLNamedType,
  isNonNullType,
  isListType,
  isWrappingType,
  GraphQLEnumType,
  GraphQLType,
  GraphQLInterfaceType, isScalarType, GraphQLFieldMap, GraphQLArgument, isNullableType,
} from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';

type ImportItems = {
  [key: string]: string,
}

type Imports = {
  [mod: string]: ImportItems,
}

type ImportHelper = {
  add(mod: string, item: string, alias?: string): void;
  addLocal(file: string, item: string, alias?: string): void;
  addRosetta(item: string, alias?: string): void;
  get(): Imports;
};

const importHelper = () => {
  const imports: Imports = {};

  const add = (mod: string, item: string, alias: string = item) => {
    imports[mod] = {
      ...imports[mod],
      [item]: alias,
    };
  };

  const addLocal = (file: string, item: string, alias: string = item) => {
    add(localModule(file), item, alias);
  };

  const addRosetta = (item: string, alias: string = item) => {
    add('@ts-graphql/rosetta', item, alias);
  };

  const get = () => imports;

  return {
    add,
    addLocal,
    addRosetta,
    get,
  };
};

const interfaceName = (name: string) => `${name}FieldsInterface`;

const argName = (name: string) => scalarMapping[name] ? `GQL${name}Arg` : `${name}Arg`;
const argFieldsName = (name: string) => `${name}FieldArgs`;
const inputFieldsName = (name: string) => `${name}FieldValues`;

const localModule = (name: string) => `./${name}`;

export const generators: { [key: string]: (type: any) => string } = {
  GraphQLUnionType: renderUnionType,
  GraphQLObjectType: renderObjectType,
  GraphQLInputObjectType: renderInputObjectType,
  GraphQLScalarType: renderScalarType,
  GraphQLEnumType: renderEnumType,
  GraphQLInterfaceType: renderObjectType,
  RootType: renderRootType,
};

const scalarMapping: { [key: string]: string } = {
  Int: 'number',
  String: 'string',
  Float: 'number',
  Boolean: 'boolean',
  ID: 'string',
};

function renderScalarType(type: GraphQLScalarType): string {
  return `${renderDescription(type.description)}\nexport type ${type.name} = ${scalarMapping[type.name] || 'any'}`;
}

function renderEnumType(type: GraphQLEnumType): string {
  return `${renderDescription(type.description)}export enum ${type.name} {
${type
    .getValues()
    .map(e => `  ${e.name}: '${e.name}'`)
    .join('\n')}
}`;
}

function renderRootType(type: GraphQLObjectType): string {
  return renderObjectType(type);
}

function renderUnionType(type: GraphQLUnionType): string {
  const helper = importHelper();

  const types = type.getTypes();

  for (const type of types) {
    helper.addLocal(type.name, type.name);
  }

  const unionType = `${renderDescription(type.description)}export type ${type.name} = ${types
    .map(t => t.name)
    .join(' | ')}`;

  return [renderImports(helper.get()), unionType].join('\n\n');
}

function renderObjectType(
  type: GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType,
): string {
  const helper = importHelper();

  const fieldMap = type.getFields() as GraphQLFieldMap<any, any, any>;
  const fields = Object.keys(fieldMap).map((key) => fieldMap[key]);
  for (const field of fields) {
    const typeImport = resolveBaseType(field.type);
    helper.addLocal(typeImport, typeImport);
  }

  const fieldDefinitions = fields
    .map((field) => `  ${renderFieldName(field)}: ${renderFieldType(field.type, helper)}`)
    .join('\n');

  const classFieldDefinitions = fields
    .map((field) => `  ${renderFieldNameForClass(field)}: ${renderFieldType(field.type, helper)}`)
    .join('\n');

  const queryFieldDefinitions = fields
    .map((field) => {
      const isScalar = isScalarType(field.type) || (isNonNullType(field.type) && isScalarType(field.type.ofType));

      const hasArgs = !!field.args.length;

      const exp = `export const ${field.name} =`;

      if (isScalar) {
        helper.addRosetta(hasArgs ? 'leafFieldWithArgs' : 'leafField');

        return hasArgs
          ? `${exp} leafFieldWithArgs<${type.name}, '${field.name}', ${renderArgs(field.args, helper)}>('${field.name}')`
          : `${exp} leafField<${type.name}, '${field.name}'>('${field.name}')`;
      }

      helper.addRosetta(hasArgs ? 'branchFieldWithArgs' : 'branchField');

      const baseFieldType = resolveBaseType(field.type);
      helper.addLocal(baseFieldType, baseFieldType);

      return hasArgs
        ? `${exp} branchFieldWithArgs<${type.name}, '${field.name}', ${resolveBaseType(field.type)}, ${renderArgs(field.args, helper)}>('${field.name}')`
        : `${exp} branchField<${type.name}, '${field.name}', ${resolveBaseType(field.type)}>('${field.name}')`;
    })
    .join('\n');

  let interfaces: GraphQLInterfaceType[] = [];
  if (type instanceof GraphQLObjectType) {
    interfaces = type.getInterfaces();
    for (const iface of interfaces) {
      helper.addLocal(iface.name, interfaceName(iface.name));
    }
  }

  const imports = renderImports(helper.get());

  const fieldsInterface = renderInterface(type.name, type.description, interfaces, fieldDefinitions, helper);
  const objectTypeClass = renderTypeClass(type.name, type.description, interfaceName(type.name), classFieldDefinitions);

  const allFieldDefinitions = fields
    .map((field) => `  ${field.name},`)
    .join('\n');

  const allFieldDefinitionsObj = `export const ${type.name}Fields = {\n${allFieldDefinitions}\n};`;

  return [imports, fieldsInterface, objectTypeClass, queryFieldDefinitions, allFieldDefinitionsObj].join('\n\n');
}

function renderInputObjectType(
  type: GraphQLInputObjectType,
): string {
  const helper = importHelper();

  helper.addRosetta('TypeWrapper');
  helper.addRosetta('InputType');

  const argsName = argFieldsName(type.name);
  const inputName = inputFieldsName(type.name);

  const inputFieldDefinitions = Object.keys(type.getFields())
    .map((name) => {
      const field = type.getFields()[name];
      const typeImport = resolveBaseType(field.type);
      helper.addLocal(typeImport, typeImport);
      return `  ${renderFieldNameForClass(field)}: ${renderFieldType(field.type, helper)}`;
    })
    .join('\n');
  const inputFieldsClass = renderTypeClass(inputName, null, null, inputFieldDefinitions);

  const argFieldDefinitions = Object.keys(type.getFields())
    .map((name) => {
      const field = type.getFields()[name];
      return `  ${renderFieldName(field)}: ${renderArgType(field.type, helper)}`;
    })
    .join(`\n`);
  const argsFieldsType = renderType(argsName, argFieldDefinitions);

  const varClass = `export class ${
    type.name
  } extends InputType<${
    argsName
  }, ${
    inputName
  }> {\n  argsType!: ${argFieldsName(type.name)};\n  value!: ${inputFieldsName(type.name)};\n}`;

  const argType = `export type ${argName(type.name)} = TypeWrapper<${argsName}, ${inputName}>;`;

  const imports = renderImports(helper.get());
  return [imports, inputFieldsClass, argsFieldsType, varClass, argType].join('\n\n');
}

export function renderFieldNameForClass(field: GraphQLInputField | GraphQLField<any, any>) {
  return `${field.name}${isNonNullType(field.type) ? '!' : '?'}`;
}

export function renderFieldName(field: GraphQLInputField | GraphQLField<any, any>) {
  return `${field.name}${isNonNullType(field.type) ? '' : '?'}`;
}

export function renderFieldType(type: GraphQLInputType | GraphQLOutputType, helper: ImportHelper, nullable: boolean = true): string {
  if (isNonNullType(type)) {
    return renderFieldType(type.ofType, helper, false);
  }
  if (isListType(type)) {
    return `Array<${renderFieldType(type.ofType, helper)}>`;
  }

  if (nullable) {
    helper.addRosetta('Maybe');
  }

  return nullable
    ? `Maybe<${type.name}>`
    : type.name;
}

function renderArgs(args: GraphQLArgument[], helper: ImportHelper) {
  const properties = args
    .map((arg) => `${arg.name}${isNullableType(arg.type) ? '?' : ''}: ${renderArgType(arg.type, helper)}`)
    .join(', ');
  return `{ ${properties} }`;
}

function renderArgType(type: GraphQLInputType, helper: ImportHelper, nullable: boolean = true): string {
  if (isNonNullType(type)) {
    return renderArgType(type.ofType, helper, false);
  }

  if (isListType(type)) {
    helper.addRosetta('ListArg');
    return `ListArg<${renderArgType(type.ofType, helper)}>`;
  }

  if (nullable) {
    helper.addRosetta('MaybeArg');
  }

  importArgType(type, helper);

  return nullable
    ? `MaybeArg<${argName(type.name)}>`
    : argName(type.name);
}

function importArgType(type: GraphQLNamedType, helper: ImportHelper) {
  if (scalarMapping[type.name]) {
    helper.addRosetta(argName(type.name));
    return;
  }

  helper.addLocal(type.name, argName(type.name));
}

function resolveBaseType(type: GraphQLType): string {
  if (isWrappingType(type)) {
    return resolveBaseType(type.ofType);
  }

  return (type as Exclude<GraphQLType, GraphQLWrappingType>).name;
}

function renderImports(imports: Imports) {
  return Object.keys(imports)
    .map((mod) => `import { ${renderImportItems(imports[mod])} } from '${mod}';`)
    .join('\n');
}

function renderImportItems(items: ImportItems) {
  return Object.keys(items)
    .map((value) => `${value}${items[value] !== value ? ` as ${items[value]}` : ''}`)
    .join(', ');
}

function renderInterface(
  name: string,
  typeDescription: Maybe<string>,
  interfaces: GraphQLInterfaceType[],
  fieldDefinitions: string,
  helper: ImportHelper,
): string {
  for (const iface of interfaces) {
    helper.addLocal(iface.name, interfaceName(iface.name));
  }
  return `${renderDescription(typeDescription)}export interface ${interfaceName(name)}${
    interfaces.length > 0 ? ` extends ${interfaces.map(i => `${interfaceName(i.name)}`).join(', ')}` : ''
  } {\n${fieldDefinitions}\n}`;
}

export function renderTypeClass(name: string, typeDescription: Maybe<string>, iface: string | null, fieldDefinitions: string): string {
  return `${renderDescription(typeDescription)}export class ${name}${iface ? ` implements ${iface}` : ''} {\n${fieldDefinitions}\n}`;
}

function renderType(name: string, fieldDefinitions: string) {
  return `export type ${name} = {\n${fieldDefinitions}\n}`;
}

function renderDescription(description?: Maybe<string>) {
  return description
    ? `/**\n${description.split('\n').map(l => ` * ${l}`).join('\n')}\n*/`
    : '';
}

