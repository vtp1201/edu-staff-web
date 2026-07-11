import type { AcademicYear } from "../../domain/entities/academic-year.entity";
import type { Term } from "../../domain/entities/term.entity";
import type {
  AcademicYearResponseDto,
  TermResponseDto,
} from "../dtos/academic-year-response.dto";

export const TermMapper = {
  fromDto(dto: TermResponseDto): Term {
    return {
      id: dto.termId,
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      // `hasGrades` does not exist on the wire — always false. The real
      // protection against deleting a graded term is the 409
      // CALENDAR_TERM_IN_USE returned on archive (mapped to graded-term-delete).
      hasGrades: false,
    };
  },
};

export const AcademicYearMapper = {
  /**
   * Map the flat wire year DTO to everything on {@link AcademicYear} EXCEPT the
   * nested `terms` (which live on a separate resource). `isActive` is derived
   * from the `status` enum.
   */
  fromFlatDto(dto: AcademicYearResponseDto): Omit<AcademicYear, "terms"> {
    return {
      id: dto.academicYearId,
      label: dto.label,
      isActive: dto.status === "ACTIVE",
    };
  },

  /**
   * Assemble the full nested {@link AcademicYear} from the flat year DTO plus
   * the term DTOs fetched separately (`GET .../{yearId}/terms`).
   */
  fromDto(
    dto: AcademicYearResponseDto,
    termDtos: TermResponseDto[],
  ): AcademicYear {
    return {
      ...AcademicYearMapper.fromFlatDto(dto),
      terms: termDtos.map(TermMapper.fromDto),
    };
  },
};
