import 'jest';
import { GraphQLEnumType } from 'graphql';
import { renderEnumType } from '../generators';

describe('enumType', () => {
  it('should return string enum', () => {
    const enumType = new GraphQLEnumType({
      name: 'Foo',
      values: {
        FOO: {},
        BAR: {},
        BAZ: {},
      },
    });

    const expected = `export enum Foo {
  FOO = 'FOO',
  BAR = 'BAR',
  BAZ = 'BAZ',
}`;

    expect(renderEnumType(enumType)).toEqual(expected);
  });
});
