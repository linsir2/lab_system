package com.lab.gateway.person.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.person.dto.PersonRequest;
import com.lab.gateway.person.entity.Person;
import com.lab.gateway.person.repository.PersonRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PersonServiceTest {

    @Mock
    private PersonRepository repository;

    @InjectMocks
    private PersonService service;

    @Test
    void createMapsRequestToEntity() {
        when(repository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Person created = service.create(new PersonRequest("张三", PersonRole.STUDENT, PersonStatus.ACTIVE));

        assertThat(created.getName()).isEqualTo("张三");
        assertThat(created.getRole()).isEqualTo(PersonRole.STUDENT);
        assertThat(created.getStatus()).isEqualTo(PersonStatus.ACTIVE);
    }

    @Test
    void getMissingThrows404() {
        when(repository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(9L))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(404);
    }

    @Test
    void listUsesRoleAndStatusFilter() {
        when(repository.findByRoleAndStatus(PersonRole.STUDENT, PersonStatus.ACTIVE))
                .thenReturn(List.of(new Person()));

        assertThat(service.list(PersonRole.STUDENT, PersonStatus.ACTIVE)).hasSize(1);
        verify(repository).findByRoleAndStatus(PersonRole.STUDENT, PersonStatus.ACTIVE);
    }

    @Test
    void listUsesRoleFilter() {
        when(repository.findByRole(PersonRole.TEACHER)).thenReturn(List.of(new Person()));

        assertThat(service.list(PersonRole.TEACHER, null)).hasSize(1);
        verify(repository).findByRole(PersonRole.TEACHER);
    }

    @Test
    void listUsesStatusFilter() {
        when(repository.findByStatus(PersonStatus.INACTIVE)).thenReturn(List.of(new Person()));

        assertThat(service.list(null, PersonStatus.INACTIVE)).hasSize(1);
        verify(repository).findByStatus(PersonStatus.INACTIVE);
    }

    @Test
    void listWithoutFiltersReturnsAll() {
        when(repository.findAll()).thenReturn(List.of(new Person(), new Person()));

        assertThat(service.list(null, null)).hasSize(2);
        verify(repository).findAll();
    }

    @Test
    void updateChangesFields() {
        Person existing = new Person();
        existing.setName("旧名字");
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);

        Person updated = service.update(1L, new PersonRequest("新名字", PersonRole.ADMIN, PersonStatus.INACTIVE));

        assertThat(updated.getName()).isEqualTo("新名字");
        assertThat(updated.getRole()).isEqualTo(PersonRole.ADMIN);
        assertThat(updated.getStatus()).isEqualTo(PersonStatus.INACTIVE);
    }

    @Test
    void deleteMissingThrows404() {
        when(repository.existsById(9L)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(9L))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(404);
    }

    @Test
    void deleteExistingRemovesEntity() {
        when(repository.existsById(1L)).thenReturn(true);

        service.delete(1L);

        verify(repository).deleteById(1L);
    }
}
