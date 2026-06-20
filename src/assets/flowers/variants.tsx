import type { ReactNode } from 'react';

import { FlowerBloom as Grass1Bloom, FlowerBloomBounds as Grass1BloomBounds } from './grass-1/bloom.tsx';
import { FlowerBud as Grass1Bud, FlowerBudBounds as Grass1BudBounds } from './grass-1/bud.tsx';
import { FlowerStem as Grass1Stem } from './grass-1/stem.tsx';
import { FlowerBloom as Grass2Bloom, FlowerBloomBounds as Grass2BloomBounds } from './grass-2/bloom.tsx';
import { FlowerBud as Grass2Bud, FlowerBudBounds as Grass2BudBounds } from './grass-2/bud.tsx';
import { FlowerStem as Grass2Stem } from './grass-2/stem.tsx';
import { FlowerBloom as Grass3Bloom, FlowerBloomBounds as Grass3BloomBounds } from './grass-3/bloom.tsx';
import { FlowerBud as Grass3Bud, FlowerBudBounds as Grass3BudBounds } from './grass-3/bud.tsx';
import { FlowerStem as Grass3Stem } from './grass-3/stem.tsx';
import { FlowerBloom as Todo1Bloom, FlowerBloomBounds as Todo1BloomBounds } from './todo-1/bloom.tsx';
import { FlowerBud as Todo1Bud, FlowerBudBounds as Todo1BudBounds } from './todo-1/bud.tsx';
import { FlowerStem as Todo1Stem } from './todo-1/stem.tsx';
import { FlowerBloom as Todo2Bloom, FlowerBloomBounds as Todo2BloomBounds } from './todo-2/bloom.tsx';
import { FlowerBud as Todo2Bud, FlowerBudBounds as Todo2BudBounds } from './todo-2/bud.tsx';
import { FlowerStem as Todo2Stem } from './todo-2/stem.tsx';
import { FlowerBloom as Todo3Bloom, FlowerBloomBounds as Todo3BloomBounds } from './todo-3/bloom.tsx';
import { FlowerBud as Todo3Bud, FlowerBudBounds as Todo3BudBounds } from './todo-3/bud.tsx';
import { FlowerStem as Todo3Stem } from './todo-3/stem.tsx';

export type FlowerLevel = 1 | 2 | 3;
export type FlowerKind = 'todo' | 'grass';

export type FlowerBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type FlowerAssetSet = {
  stem: ReactNode;
  bud: ReactNode;
  bloom: ReactNode;
  budBounds: FlowerBounds;
  bloomBounds: FlowerBounds;
};

export const FLOWER_ASSETS: Record<FlowerKind, Record<FlowerLevel, FlowerAssetSet>> = {
  todo: {
    1: {
      stem: <Todo1Stem />,
      bud: <Todo1Bud />,
      bloom: <Todo1Bloom />,
      budBounds: Todo1BudBounds,
      bloomBounds: Todo1BloomBounds,
    },
    2: {
      stem: <Todo2Stem />,
      bud: <Todo2Bud />,
      bloom: <Todo2Bloom />,
      budBounds: Todo2BudBounds,
      bloomBounds: Todo2BloomBounds,
    },
    3: {
      stem: <Todo3Stem />,
      bud: <Todo3Bud />,
      bloom: <Todo3Bloom />,
      budBounds: Todo3BudBounds,
      bloomBounds: Todo3BloomBounds,
    },
  },
  grass: {
    1: {
      stem: <Grass1Stem />,
      bud: <Grass1Bud />,
      bloom: <Grass1Bloom />,
      budBounds: Grass1BudBounds,
      bloomBounds: Grass1BloomBounds,
    },
    2: {
      stem: <Grass2Stem />,
      bud: <Grass2Bud />,
      bloom: <Grass2Bloom />,
      budBounds: Grass2BudBounds,
      bloomBounds: Grass2BloomBounds,
    },
    3: {
      stem: <Grass3Stem />,
      bud: <Grass3Bud />,
      bloom: <Grass3Bloom />,
      budBounds: Grass3BudBounds,
      bloomBounds: Grass3BloomBounds,
    },
  },
};
