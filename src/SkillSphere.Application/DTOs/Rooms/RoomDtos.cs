using SkillSphere.Domain.Enums;

namespace SkillSphere.Application.DTOs.Rooms;

public class RoomDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public RoomType RoomType { get; set; }
    public int Capacity { get; set; }
    public string? Building { get; set; }
    public int? Floor { get; set; }
    public bool IsActive { get; set; }
}

public class CreateRoomRequest
{
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public RoomType RoomType { get; set; }
    public int Capacity { get; set; }
    public string? Building { get; set; }
    public int? Floor { get; set; }
}

public class UpdateRoomRequest
{
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public RoomType RoomType { get; set; }
    public int Capacity { get; set; }
    public string? Building { get; set; }
    public int? Floor { get; set; }
}
