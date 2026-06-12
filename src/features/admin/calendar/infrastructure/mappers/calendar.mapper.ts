import type { AcademicYear } from "../../domain/entities/academic-year.entity";
import type { Term } from "../../domain/entities/term.entity";
import type {
  AcademicYearDto,
  TermDto,
} from "../dtos/academic-year-response.dto";

export const TermMapper = {
  fromDto(dto: TermDto): Term {
    return {
      id: dto.id,
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      hasGrades: dto.hasGrades,
    };
  },
};

export const AcademicYearMapper = {
  fromDto(dto: AcademicYearDto): AcademicYear {
    return {
      id: dto.id,
      label: dto.label,
      isActive: dto.isActive,
      terms: dto.terms.map(TermMapper.fromDto),
    };
  },
};
