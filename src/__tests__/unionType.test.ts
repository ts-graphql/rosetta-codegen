import 'jest';
import { GraphQLObjectType, GraphQLString, GraphQLUnionType } from 'graphql';
import { renderUnionType } from '../generators';

describe('union type', () => {
  it('should return correct output', () => {
    const Foo = new GraphQLObjectType({
      name: 'Foo',
      fields: {
        foo: { type: GraphQLString },
      },
    });

    const Bar = new GraphQLObjectType({
      name: 'Bar',
      fields: {
        bar: { type: GraphQLString },
      },
    });

    const FooBar = new GraphQLUnionType({
      name: 'FooBar',
      types: [Foo, Bar],
    });

    const expected = `import { Bar } from './Bar';
import { Foo } from './Foo';

export type FooBar = Foo | Bar;
`;

    expect(renderUnionType(FooBar)).toEqual(expected);
  });
});
