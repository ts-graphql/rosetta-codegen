import 'jest';
import {
  GraphQLID,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { renderObjectType } from '../generators';

describe('object type', () => {
  it('should return correct output', () => {
    const Node = new GraphQLInterfaceType({
      name: 'Node',
      fields: {
        id: { type: GraphQLNonNull(GraphQLID) },
      },
    });

    const Bar = new GraphQLObjectType({
      name: 'Bar',
      fields: {
        bar: { type: GraphQLString },
      },
    });

    const Foo = new GraphQLObjectType({
      name: 'Foo',
      interfaces: [Node],
      fields: {
        id: { type: GraphQLNonNull(GraphQLID) },
        bar: { type: Bar },
        barNonNull: { type: GraphQLNonNull(Bar) },
        barList: { type: GraphQLList(Bar) },
        barListNonNull: { type: GraphQLList(GraphQLNonNull(Bar)) },
        barNonNullList: { type: GraphQLNonNull(GraphQLList(Bar)) },
        barNonNullListNonNull: { type: GraphQLNonNull(GraphQLList(GraphQLNonNull(Bar))) },
      },
    });

    const expected = `import { Bar } from './Bar';
import { ID } from './ID';
import { NodeFieldsInterface } from './Node';
import { Maybe, branchField, leafField } from '@ts-graphql/rosetta';

export interface FooFieldsInterface extends NodeFieldsInterface {
  id: ID;
  bar?: Maybe<Bar>;
  barNonNull: Bar;
  barList?: Maybe<Array<Maybe<Bar>>>;
  barListNonNull?: Maybe<Array<Bar>>;
  barNonNullList: Array<Maybe<Bar>>;
  barNonNullListNonNull: Array<Bar>;
}

export class Foo implements FooFieldsInterface {
  id!: ID;
  bar?: Maybe<Bar>;
  barNonNull!: Bar;
  barList?: Maybe<Array<Maybe<Bar>>>;
  barListNonNull?: Maybe<Array<Bar>>;
  barNonNullList!: Array<Maybe<Bar>>;
  barNonNullListNonNull!: Array<Bar>;
}

export const id = leafField<Foo, 'id'>('id');
export const bar = branchField<Foo, 'bar', Bar>('bar');
export const barNonNull = branchField<Foo, 'barNonNull', Bar>('barNonNull');
export const barList = branchField<Foo, 'barList', Bar>('barList');
export const barListNonNull = branchField<Foo, 'barListNonNull', Bar>('barListNonNull');
export const barNonNullList = branchField<Foo, 'barNonNullList', Bar>('barNonNullList');
export const barNonNullListNonNull = branchField<Foo, 'barNonNullListNonNull', Bar>('barNonNullListNonNull');

export const FooFields = {
  id,
  bar,
  barNonNull,
  barList,
  barListNonNull,
  barNonNullList,
  barNonNullListNonNull,
};
`;

    expect(renderObjectType(Foo)).toEqual(expected);
  });
});
