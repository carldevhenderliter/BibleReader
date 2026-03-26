import { jest } from "@jest/globals";

export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn()
};

export const useRouter = () => mockRouter;

export const notFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

export const redirect = jest.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
