declare module "*.d2" {
  const svg: string;
  export default svg;
}

declare module "*.d2?steps" {
  const boards: string[];
  export default boards;
}
