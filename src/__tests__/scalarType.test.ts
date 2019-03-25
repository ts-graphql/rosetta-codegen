import 'jest';
import { renderScalarType } from '../generators';
import { GraphQLBoolean, GraphQLFloat, GraphQLID, GraphQLInt, GraphQLScalarType, GraphQLString } from 'graphql';

describe('scalars', () => {
  describe('built in', () => {
    it('should generate correct types', () => {
      expect(renderScalarType(GraphQLString, true))
        .toEqual('export type String = string;\n');
      expect(renderScalarType(GraphQLInt, true))
        .toEqual('export type Int = number;\n');
      expect(renderScalarType(GraphQLFloat, true))
        .toEqual('export type Float = number;\n');
      expect(renderScalarType(GraphQLBoolean, true))
        .toEqual('export type Boolean = boolean;\n');
      expect(renderScalarType(GraphQLID, true))
        .toEqual('export type ID = string;\n');
    });
  });

  describe('custom', () => {
    it('should render as any', () => {
      const customScalar = new GraphQLScalarType({
        name: 'Foo',
        serialize: () => null,
      });

      expect(renderScalarType(customScalar, true))
        .toEqual('export type Foo = any;\n');
    });
  });
});
