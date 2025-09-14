import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { memberuserAuthorize } from "../providers/authorize/memberuserAuthorize";

/**
 * Decorator for authenticating member users via JWT in NestJS controllers.
 * Injects the authenticated MemberuserPayload into handler parameters.
 * Adds Bearer auth security to Swagger docs automatically.
 *
 * @returns {ParameterDecorator}
 */
export const MemberuserAuth = (): ParameterDecorator => (
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
): void => {
  SwaggerCustomizer((props) => {
    props.route.security ??= [];
    props.route.security.push({
      bearer: [],
    });
  })(target, propertyKey as string, undefined!);
  singleton.get()(target, propertyKey, parameterIndex);
};

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return memberuserAuthorize(request);
  })(),
);
