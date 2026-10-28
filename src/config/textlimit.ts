
export const textLimit = (item: string, limit: number) => {
  return item?.length > limit ? item?.slice(0, limit) + "..." : item
}