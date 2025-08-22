import React from 'react';
import { render, screen } from '@testing-library/react';
import { createIntl } from 'react-intl';
import { CourseRunFactoryFromPriority, PacedCourseFactory } from 'utils/test/factories/richie';
import { SyllabusAsideList } from './index';
import { Priority, CourseRun } from 'types';
import { render as renderWithProviders } from 'utils/test/render';

const intl = createIntl({ locale: 'en' });

describe('<SyllabusAsideList/>', () => {
  const course = PacedCourseFactory().one();
  const maxArchivedCourseRuns = 5;

  it('renders nothing when there are no course runs to display', () => {
    const courseRuns: CourseRun[] = [];

    const { container } = render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when only ONGOING_OPEN course runs exist', () => {
    const courseRuns: CourseRun[] = [
      CourseRunFactoryFromPriority(Priority.ONGOING_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.ONGOING_OPEN)().one(),
    ];

    const { container } = render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders component when FUTURE_OPEN course runs exist', () => {
    const courseRuns: CourseRun[] = [
      CourseRunFactoryFromPriority(Priority.FUTURE_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.ONGOING_OPEN)().one(), // This should be filtered out
    ];

    render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    // Should show the title
    expect(screen.getByText('Course runs')).toBeInTheDocument();
    
    // Should show the FUTURE_OPEN course run in the opened runs section
    expect(screen.getByText(courseRuns[0].title ?? 'Title')).toBeInTheDocument();
    
    // Should NOT show the ONGOING_OPEN course run
    expect(screen.queryByText(courseRuns[1].title ?? 'Title')).not.toBeInTheDocument();
  });

  it('renders component when ARCHIVED_OPEN course runs exist', () => {
    const courseRuns: CourseRun[] = [
      CourseRunFactoryFromPriority(Priority.ARCHIVED_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.ONGOING_OPEN)().one(), // This should be filtered out
    ];

    render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    // Should show the title
    expect(screen.getByText('Course runs')).toBeInTheDocument();
    
    // Should show the ARCHIVED_OPEN course run in the opened runs section
    expect(screen.getByText(courseRuns[0].title ?? 'Title')).toBeInTheDocument();
    
    // Should NOT show the ONGOING_OPEN course run
    expect(screen.queryByText(courseRuns[1].title ?? 'Title')).not.toBeInTheDocument();
  });

  it('renders component when other types of course runs exist', () => {
    const courseRuns: CourseRun[] = [
      CourseRunFactoryFromPriority(Priority.TO_BE_SCHEDULED)().one(),
      CourseRunFactoryFromPriority(Priority.FUTURE_NOT_YET_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.ONGOING_OPEN)().one(), // This should be filtered out
    ];

    render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    // Should show the title
    expect(screen.getByText('Course runs')).toBeInTheDocument();
    
    // Should show the TO_BE_SCHEDULED section
    expect(screen.getByText('To be scheduled')).toBeInTheDocument();
    
    // Should show the UPCOMING section
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    
    // Should NOT show the ONGOING_OPEN course run
    expect(screen.queryByText(courseRuns[2].title ?? 'Title')).not.toBeInTheDocument();
  });

  it('filters out ONGOING_OPEN from openedRuns but keeps other relevant runs', () => {
    const courseRuns: CourseRun[] = [
      CourseRunFactoryFromPriority(Priority.FUTURE_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.ARCHIVED_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.ONGOING_OPEN)().one(), // This should be filtered out
    ];

    render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    // Should show the title
    expect(screen.getByText('Course runs')).toBeInTheDocument();
    
    // Should show both FUTURE_OPEN and ARCHIVED_OPEN course runs
    expect(screen.getByText(courseRuns[0].title ?? 'Title')).toBeInTheDocument();
    expect(screen.getByText(courseRuns[1].title ?? 'Title')).toBeInTheDocument();
    
    // Should NOT show the ONGOING_OPEN course run
    expect(screen.queryByText(courseRuns[2].title ?? 'Title')).not.toBeInTheDocument();
  });

  it('shows "Other course runs" title when there is exactly one opened run', () => {
    const courseRuns: CourseRun[] = [
      CourseRunFactoryFromPriority(Priority.FUTURE_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.TO_BE_SCHEDULED)().one(),
    ];

    render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    // Should show "Other course runs" when there's exactly one opened run
    expect(screen.getByText('Other course runs')).toBeInTheDocument();
  });

  it('shows "Course runs" title when there are multiple opened runs', () => {
    const courseRuns: CourseRun[] = [
      CourseRunFactoryFromPriority(Priority.FUTURE_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.ARCHIVED_OPEN)().one(),
      CourseRunFactoryFromPriority(Priority.TO_BE_SCHEDULED)().one(),
    ];

    render(
      <SyllabusAsideList
        courseRuns={courseRuns}
        course={course}
        maxArchivedCourseRuns={maxArchivedCourseRuns}
      />,
    );

    // Should show "Course runs" when there are multiple opened runs
    expect(screen.getByText('Course runs')).toBeInTheDocument();
  });
});
