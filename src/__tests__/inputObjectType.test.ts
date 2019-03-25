import 'jest';
import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql';
import { renderInputObjectType } from '../generators';

describe('input object type', () => {
  it('should return correct output', () => {
    const BarInput = new GraphQLInputObjectType({
      name: 'BarInput',
      fields: {
        bar: {
          type: GraphQLString,
        },
      },
    });

    const FooInput = new GraphQLInputObjectType({
      name: 'FooInput',
      fields: {
        string: { type: GraphQLNonNull(GraphQLString) },
        bar: { type: BarInput },
      },
    });

    const expected = `import { BarInputArg, BarInputFieldValues } from './BarInput';
import { String } from './String';
import { GQLStringArg, InputType, Maybe, MaybeArg, TypeWrapper } from '@ts-graphql/rosetta';

export class FooInputFieldValues {
  string!: String;
  bar?: Maybe<BarInputFieldValues>;
}

export type FooInputFieldArgs = {
  string: GQLStringArg,
  bar?: MaybeArg<BarInputArg>,
}

export class FooInput extends InputType<FooInputFieldArgs, FooInputFieldValues> {
  argsType!: FooInputFieldArgs;
  value!: FooInputFieldValues;
}

export type FooInputArg = TypeWrapper<FooInputFieldArgs, FooInputFieldValues>;
`;

    expect(renderInputObjectType(FooInput)).toEqual(expected);
  });
});
