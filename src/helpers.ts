export function logger(message: any, ...optionalParams: any[]): void {
  const isDebugMode = process.env.NODE_ENV === 'debug';
  if (isDebugMode) {
    console.log(message, ...optionalParams);
  }
}
