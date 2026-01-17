/**
 * Testing utilities for the unified-list package.
 *
 * Exports fixtures, test harness, and types for creating isolated tests.
 */

// Test entity types and factories
export {
  type TestEntity,
  createTestEntity,
  createTestEntities,
  resetEntityCounter,
  // Preset datasets
  FIXTURE_SMALL_LIST,
  FIXTURE_LARGE_LIST,
  FIXTURE_MIXED_TYPES,
  FIXTURE_GROUPED_LIST,
  createLargeList,
  // Filter configs
  testDocumentFilter,
  testTaskFilter,
  testEmailFilter,
  testChannelFilter,
  testUnreadFilter,
  testNotDoneFilter,
  testHighPriorityFilter,
  TEST_FILTERS,
  // Sort configs
  testNameSort,
  testUpdatedAtSort,
  testCreatedAtSort,
  testPrioritySort,
  TEST_SORTS,
  // GroupBy configs
  testTypeGroupKeyFn,
  testPriorityGroupKeyFn,
  testCategoryGroupKeyFn,
  testTypeGroupRegistry,
  testPriorityGroupRegistry,
  // Search helpers
  testLocalSearchFilter,
} from './fixtures';

// Test harness component and types
export {
  TestHarness,
  NavigationTestHarness,
  SelectionTestHarness,
  FullTestHarness,
  type TestHarnessConfig,
  type TestControllerState,
  type TestStoresState,
  type TestCommands,
} from './TestHarness';
