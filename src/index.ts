import { GraphQLSchema } from 'graphql';
import { generators } from './generators';

export type Output = {
    [typeName: string]: string,
};

export const generate = (schema: GraphQLSchema): Output => {
    const typeNames = Object
        .keys(schema.getTypeMap())
        .filter(typeName => !typeName.startsWith('__'))
        .filter(typeName => typeName !== schema.getQueryType()!.name)
        .filter(typeName => schema.getMutationType() ? typeName !== schema.getMutationType()!.name : true)
        .filter(typeName => schema.getSubscriptionType() ? typeName !== schema.getSubscriptionType()!.name : true)
        .sort((a,b) => schema.getType(a)!.constructor.name < schema.getType(b)!.constructor.name ? -1 : 1)

    const output: Output = {};

    for (const typeName of typeNames) {
        const type = schema.getTypeMap()[typeName];
        if (generators[type.constructor.name]) {
            output[typeName] = generators[type.constructor.name](type);
        }
    }

    const queryType = schema.getQueryType()!;
    output[queryType.name] = generators.RootType(queryType);

    const mutationType = schema.getMutationType();
    if (mutationType) {
        output[mutationType.name] = generators.RootType(mutationType);
    }

    return output;
};
