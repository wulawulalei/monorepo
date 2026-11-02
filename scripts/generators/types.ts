// 生成器共用类型：命令行参数、执行上下文与命令定义。
export type GeneratorFlags = Record<string, string | boolean>;

export interface GeneratorArgs {
  positionals: string[];
  flags: GeneratorFlags;
}

export interface GeneratorContext {
  cwd: string;
  root: string;
}

export interface GeneratorCommand {
  describe: string;
  run(args: GeneratorArgs, context: GeneratorContext): number;
}
